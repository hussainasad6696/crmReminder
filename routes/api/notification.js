const { json } = require('express');
const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();

router.post('/sendToAll', (req, res)=>{
    var notification ={
        'title' : 'Alarm',
        'text' : 'You have a reminder.'
    };

    var fcm_token = [];
    console.log(fcm_tokens);
    var notification_body = {
        'notification' : notification,
        'registration_ids' : fcm_tokens
    }

    fetch('https://fcm.googleapis.com/fcm/send', {
        'method':'POST',
        'headers':{
            'Authorization':'key='+'AAAAOrXHwlg:APA91bGyXiLSX1UoRd03H6o8snyWwCZrDhX3btIyNSvwhvlnzVUFumwmcpG-hfUenLhXGSIeyo3fCY9jGLKUnN3p7hoOA3_OiW0dyZY_WAr4QLgsVedRkfdobF__mWAN4h2t-f_zhrh5',
            'Content-Type':'application/json'
        },
        'body': JSON.stringify(notification_body)
    }).then(()=>{
        res.status(200).send('Notification sent successfuly.');
    }).catch((err)=>{
        res.send(400).send('Error: Could not send notification.');
        console.log(err);
    })
});

module.exports = router;