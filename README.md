# Mint Local

`mint-local` is a web application built with Express.js and EJS that uses the [Plaid API](https://plaid.com/) to access and display banking information locally. The project allows users to securely connect their bank accounts and view transactions, balances, and other financial data. I created this project after deleting my Mint account after the company was acquired by Intuit. 

## Features

- **Secure Bank Account Linking**: Connect your bank accounts using Plaid's secure API.
- **View Transactions**: Display recent transactions with clean, user-friendly EJS templates.
- **Account Balances**: View account balances and other financial information in real-time.
- **Local Setup**: Keep your data private by running the application locally.

## Technologies Used

- **Backend**: [Express.js](https://expressjs.com/) - A fast, unopinionated, minimalist web framework for Node.js.
- **Frontend**: [EJS](https://ejs.co/) - Embedded JavaScript templating for dynamic HTML generation.
- **API Integration**: [Plaid API](https://plaid.com/) - Seamlessly access and interact with financial data.
- **Environment Variables**: [dotenv](https://www.npmjs.com/package/dotenv) - Manage sensitive information like API keys.

## Prerequisites

- **Node.js** (v14 or later)
- **npm** or **yarn**
- A [Plaid](https://plaid.com/) account and API keys
