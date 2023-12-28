const express = require('express')
const app = express()
const port = 3000

// set the view engine to ejs
app.set('view engine', 'ejs');

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
    'mint_local',
    'root',
    'root',
    {
        host: 'localhost',
        port: 8806,
        dialect: 'mysql'
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
        allowNull: false,
        primaryKey: true
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

app.get('/', async (req, res) => {
    const d = new Date();
    let month = d.getMonth()+1;
    const transactions = await Transaction.findAll({
        where: {
            date: {
                [Op.like]: month+'/%%/2023'
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

    if(req.query.search){
        const transactions = await Transaction.findAll({
            where: {
                description: {
                    [Op.like]: '%'+req.query.search+'%'
                }
            }

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
        }
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
app.get('/transactions/:id', async (req, res) => {
    const trans = await Transaction.findByPk(req.params.id);

    res.render('transactions/view', {
        transaction: trans,
    });
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
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})