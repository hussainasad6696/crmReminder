const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LoginSchema = new Schema({
    userName: {
        type: String
    },
    password: {
        type: String
    },
    maxLogins: {
        type: Number
    },
    accountType: {
        type: String
    },
    supervisorAdmin: {
        type: String
    },
    numLogins: {
        type: Number
    },
    alarmIDs: [{
        type: String
    }],
    deviceTokens: [{
        type: String
    }],
    clientList: [{
        type: String
    }]
})

const Login = mongoose.model('login', LoginSchema);
module.exports = Login;