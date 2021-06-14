const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AlarmSchema = new Schema({
    supervisorAdmin: {
        type: String,
    },
    deviceUserName:{
        type: String
    },
    clientId: {
        type: String
    }
});

const ClientsList = mongoose.model('clientList', AlarmSchema);
module.exports = ClientsList;