const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const HistorySchema = new Schema({
    deviceUserName: {
        type: String
    },
    alarmName: {
        type: String
    },
    date: {
        type: String
    },
    time: {
        type: String
    },
    userName: {
        type: String
    },
    phoneNumber: {
        type: String
    },
    email: {
        type: String
    },
    thirdPartDetail: {
        type: String
    },
    backGroundColor: {
        type: String
    },
    comment: {
        type: String,
    },
    additionalInfo: {
        type: Boolean
    },
    extraUserInfo: {
        companyName:{
            type: String
        },
        address:{
            type: String
        },
        webSite:{
            type: String
        },
        position:{
            type: String
        },
        mobile:{
            type: String
        }
    },
    timeCreated: {
        type: String
    },
    createdBy: {
        type: String
    }
});

const History = mongoose.model('history', HistorySchema);
module.exports = History;