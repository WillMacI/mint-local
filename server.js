const express = require('express')
const app = express()
const port = 3000

// set the view engine to ejs
app.set('view engine', 'ejs');
require('dotenv').config();
const axios = require('axios')
var bodyParser = require('body-parser')
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));


const { Sequelize, DataTypes } = require("sequelize");
const Op = Sequelize.Op;
const operatorsAliases = {
    $like: Op.like,
    $not: Op.not
}
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: process.env.DB_DIALECT
    },
    {operatorsAliases}
);

sequelize.authenticate().then(() => {
    console.log('Connection has been established successfully.');
}).catch((error) => {
    console.error('Unable to connect to the database: ', error);
});

const Transaction = sequelize.define("transactions", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
    },
    date: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.STRING,
    },
    original_description: {
        type: DataTypes.STRING,
    },
    amount: {
        type: DataTypes.DECIMAL
    },
    transaction_type: {
        type: DataTypes.STRING
    },
    category: {
        type: DataTypes.STRING
    },
    category_id: {
        type: DataTypes.INTEGER
    },
    account_name: {
        type: DataTypes.STRING
    },
    label: {
        type: DataTypes.STRING
    },
    notes: {
        type: DataTypes.STRING
    }
}, {
    timestamps: false
})

const Categories = sequelize.define("categories", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    budgeted_amount: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    budget_ignore: {
        type: DataTypes.BOOLEAN
    }
}, {
    timestamps: false
})

const Settings = sequelize.define("settings", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    value: {
        type: DataTypes.STRING,
    }
}, {
    timestamps: false
})

app.get('/', async (req, res) => {
    const date = new Date();
    let month = date.getMonth()+1;
    let year = date.getFullYear();
    const transactions = await Transaction.findAll({
        where: {
            date: {
                [Op.like]: month+'/%%/'+year
            }
        },
        order: [
            ['amount', 'DESC'],
        ],
    });
    let debit_total = 0;
    let credit_total = 0;
    transactions.forEach(function(trans) {
        if(trans.transaction_type == "debit"){
            debit_total+=parseInt(trans.amount)
        } else if(trans.transaction_type == "credit") {
            credit_total+=parseInt(trans.amount)
        }

    });
    const net = credit_total-debit_total;
    res.render('home', {
        net: net,
        transactions: transactions,
        debit_total: debit_total,
        credit_total: credit_total,
    });

})
app.get('/transactions', async (req, res) => {

    if(req.query.year){
        const transactions = await Transaction.findAll({
            where: {
                description: {
                    [Op.like]: '%'+req.query.search+'%'
                },
                date: {
                    [Op.like]: req.query.month+'/%%/'+req.query.year
                }
            },


        });
        res.render('transactions/index', {
            transactions: transactions,
            search: req.query.search
        });
    }
    const date = new Date();
    let month = date.getMonth()+1;
    let year = date.getFullYear();
    const transactions = await Transaction.findAll({
        where: {
            date: {
                [Op.like]: month+'/%%/'+year
            }
        },
        order: [
            ['date', 'DESC'],
        ],
    });
    res.render('transactions/index', {
        transactions: transactions,
        search: "",
    });
})

app.post('/transactions/edit', async (req, res) => {
    const update = await Transaction.update(req.body, {
        where: {
            id: req.body.id
        }
    });

    if(update){
        res.redirect("/transactions?update=successful")

    } else {
        res.redirect("/transactions?update=error")

    }

})
app.get('/transaction/:id', async (req, res) => {
    const categories = await Categories.findAll()

    const trans = await Transaction.findByPk(req.params.id);

    res.render('transactions/view', {
        transaction: trans,
        categories : categories
    });
})

app.get('/transactions/new', async (req, res) => {
    const categories = await Categories.findAll()
    res.render('transactions/new', { categories : categories });
})

app.post('/transactions/create', async (req, res) => {
    const trans = await Transaction.create(req.body);

    if(trans){
        res.redirect("/transactions?create=successful")

    } else {
        res.redirect("/transactions?create=error")

    }
})

async function get_transactions(month, year) {
    const transactions = await Transaction.findAll({
        where: {
            date: {
                [Op.like]: month + '/%%/' + year
            }
        }
    });
    let debit_total = 0;
    let credit_total = 0;
    transactions.forEach(function (trans) {
        if (trans.transaction_type == "debit") {
            debit_total += parseInt(trans.amount)
        } else if (trans.transaction_type == "credit") {
            credit_total += parseInt(trans.amount)
        }
    });
    console.log("Month:"+month)
    console.log("Year:"+year)
    console.log(credit_total)
    console.log(debit_total)
    console.log(credit_total - debit_total)
    return credit_total - debit_total;
}
app.get('/trends/net-income', async (req, res) => {
    const month = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const d = new Date();
    let name = month[d.getMonth()];
    let labels = [];
    let data = [];
    for(let i = 0; i<=d.getMonth(); i++){
        const transactions = await get_transactions(i+1, d.getFullYear());
        labels.push(month[i])
        data.push(transactions)
    }
    res.send([labels, data]);
})

app.get('/trends', async (req, res) => {
    res.render('trends');
})

app.get('/budget', async (req, res) => {
    //Get all categories in DB
    const categories = await Categories.findAll()
    //Let's build a balance sheet of all the categories, their transactions, and totals
    let balance_sheet = []
    let total_goal = 0
    let total_spent = 0
    //For each category get all the transactions in the category and add to total
    for (const cat of categories) {
      let category_total_spent = 0
      const transactions = await Transaction.findAll({
          where: {
              category_id : cat.id
          }
      })
      for(const trans of transactions){
          category_total_spent += parseInt(trans.amount)
      }
      if(cat.budget_ignore == false){
          total_goal+=cat.budgeted_amount
          total_spent+=category_total_spent
      }
      const percent_spent = Math.round((category_total_spent/cat.budgeted_amount)*100)
      balance_sheet.push({ category_id : cat.id, category_name: cat.name, target_amount : cat.budgeted_amount, total_spent : category_total_spent, percent_spent : percent_spent, transactions : transactions })
    }
    const total_percent_spent = Math.round((total_spent/total_goal)*100)

    function daysInMonth (month, year) {
        return new Date(year, month, 0).getDate();
    }
    const date = new Date();
    const month = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    let month_name = month[date.getMonth()];
    const days_in_month = daysInMonth(date.getMonth()+1, date.getFullYear())
    const month_percent = Math.round((parseInt(date.getDay())/parseInt(days_in_month))*100)
    res.render('budget/index', { month_name: month_name, month_percent: month_percent, balance_sheet : balance_sheet, total_goal : total_goal, total_spent : total_spent, total_percent_spent : total_percent_spent });
})

app.get('/db/sync', async (req, res) => {
   const sync = await sequelize.sync({ alter: true });
   if(sync){
       console.log('All models were synchronized successfully.');
       res.send("All models were synchronized successfully.")
   } else {
       console.log('Sync error.');
       res.send("Sync error.")

   }
})

app.get('/plaid', async (req, res) => {
    res.render('plaid/index', {})
})

app.get('/settings/db', async (req, res) => {
    const db_info = {
        name: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: process.env.DB_DIALECT,
        phpMyAdmin_port: process.env.PHPMYADMIN_PORT
    }
    res.render('settings/db', { db_info })
})

app.get('/settings/bank', async (req, res) => {

    axios.get(process.env.PLAID_API_ENDPOINT+'/api/identity')
        .then(async function (response) {
            const accounts = await axios.get(process.env.PLAID_API_ENDPOINT + '/api/accounts');
            let bank_connected = true;
            if(response.data.error){
                bank_connected = false
            } else {
                const accounts = await axios.get(process.env.PLAID_API_ENDPOINT+'/api/accounts');
                res.render('settings/bank', { bank_connected: bank_connected, accounts: accounts.data.accounts})
            }
            res.render('settings/bank', {bank_connected: response, accounts: accounts.data.accounts})

        })
        .catch(function (error) {

            res.render('errors/index', { error: "The Plaid API server is not running. " + error })

        })

    //console.log(bank_conn)
})

app.get('/settings/migrate', async (req, res) => {
    axios.get(process.env.PLAID_API_ENDPOINT+'/api/identity')
        .then(async function (response) {
            let bank_connected = true;
            if(response.data.error){
                bank_connected = false
            } else {
                const transactions = await axios.get(process.env.PLAID_API_ENDPOINT+'/api/transactions');
                res.render('settings/migrate', { bank_connected: bank_connected, transactions: transactions.data.latest_transactions})
            }
            //console.log(bank_conn)
            res.render('settings/migrate', { bank_connected: bank_connected})

        })
        .catch(function (error) {

            res.render('errors/index', { error: "The Plaid API server is not running. " + error })

        })

})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})