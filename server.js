const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const https = require('https');
const fs = require('fs');
const Alarm = require('./models/info');
const Login = require('./models/login');
const Histry = require('./models/history')
const ClientsList = require('./models/clientsListObj')
const fetch = require('node-fetch');
const schedule = require('node-schedule');
const path = require('path');
const querystring = require('querystring');
const multiparty = require('multiparty');
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");


const PORT = process.env.PORT || 50000;
const app = express();

// const sslServer = https.createServer({
//     key: fs.readFileSync('./sslCert/key.pem'),
//     cert: fs.readFileSync('./sslCert/cert.pem')
// }, app);


mongoose.connect('mongodb://localhost/CRMReminder', 
{useNewUrlParser:true, useUnifiedTopology: true, useCreateIndex: true},
err=> {
    if (!err){
        console.log('Connected to database...');
    }
    else{
        console.log('Error connecting to database '+ err);
    }
});
mongoose.Promise = global.Promise;
mongoose.set('useFindAndModify', false);

admin.initializeApp({                                       // Initialize app for job scheduling
    credential: admin.credential.cert(serviceAccount)
});

app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname,'views')));
app.use(express.json());
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

app.use("/static/", express.static(__dirname+"/static"));
app.set('view engine',"ejs");
app.listen(PORT, ()=>{
    console.log(`Server running at port ${PORT}`);
    Alarm.find({}).then((alarms, err)=>{
        if(err) {console.log(err)}
        alarms.forEach(alarm=>{
            result = help(alarm.time, alarm.date);
            min = result[0];
            hrs = result[1];
            date = result[2];
            month = result[3];
            Login.findOne({userName: alarm.deviceUserName}).then((login)=>{
                const job = schedule.scheduleJob(`${min || '00'} ${hrs || '00'} ${date || '00'} ${month || '00'} *`, ()=>{
                    var registrationToken = login.deviceTokens;
                    query = Alarm.findById(alarm._id);          // check if alarm exists in database
                        if(query)
                        {
                            registrationToken.forEach(element=> {
                                element = element.slice(1);
                                element = element.slice(0, -1);
                                console.log(element);
                                var message = {
                                    notification: {
                                        title: alarm.alarmName,
                                        body: 'Comment: '+alarm.comment 
                                    },
                                    token: element
                                };
                                console.log("passed message json setter ........................................"+message);
                                admin.messaging().send(message)
                                .then(()=>{
                                    console.log('Notification sent: ');
                                    console.log(alarm);
                                    Histry.create(alarm).then((req, res)=>{
                                        console.log('Added to history.');
                                    });
                                    Alarm.findByIdAndDelete({_id: alarm._id}, req.body).then((his)=>{
                                        console.log("Alarm deleted from current database."+his)
                                    })
                                })
                                .catch((err)=>{
                                    console.log('Error in sending notification:----------------- ', err);
                                });
                            });
                        }
                        else
                        {
                            console.log('Deleted alarm did not send notification.');
                        }
                });
            })
            })
        })
});

app.get('/alarms', (req, res)=>{
    // Alarm.find({deviceUserName:req.query.deviceUserName}).then((alarms, err)=>{
    //     if(err) {console.log(err)};
    //     console.log(alarms+" live ----------------");
    //     res.send(alarms);
    //   })
      Alarm.find({deviceUserName: req.query.deviceUserName}).then((alarms, err)=>{
        if(err) {console.log(err)};
        if(req.query.searchKeyWord === "")
        {
            res.send(alarms);
        }
        else{
            var result = [];
            alarms.forEach(alarm => {
                if (alarm.alarmName.includes(req.query.searchKeyWord))
                {
                    result.push(alarm);
                }
            })
            if(result.length>0){
            res.send(result);
            }
            else{
                res.status(404).send('No alarm matches the keyword.');
            }
        }
      });
});

app.get('/history', (req, res)=>{
    // Histry.find({deviceUserName:req.query.deviceUserName}).then((alarms, err)=>{
    //     if(err) {console.log(err)};
    //     console.log(alarms+" history ----------------");
    //     res.send(alarms);
    //   })
      Histry.find({deviceUserName: req.query.deviceUserName}).then((alarms, err)=>{
        if(err) {console.log(err)};
        if(req.query.searchKeyWord === "")
        {
            res.send(alarms);
        }
        else{
            var result = [];
            alarms.forEach(alarm => {
                if (alarm.alarmName.includes(req.query.searchKeyWord))
                {
                    result.push(alarm);
                }
            })
            if(result.length>0){
            res.send(result);
            }
            else{
                res.status(404).send('No alarm matches the keyword.');
            }
        }
      });
});



app.post('/deviceToken', (req, res)=>{
    Login.findOneAndUpdate({userName: req.body.id},
         {$addToSet: {deviceTokens: JSON.stringify(req.body.deviceToken)}},  
         {safe: true, upsert: true, new: true}, (err, result)=>{
             if (err){
                 console.log(err+" error on device token");
             }
             console.log(result+" device token not found :"+req.body.deviceToken);
         }).then((result)=>{
            console.log('Token received.'+result.deviceToken);
            res.sendStatus(200);
         })
});



app.post('/alarms', (req, res)=>{
    console.log(JSON.stringify(req.body)+"----------===============");
    Alarm.create(req.body.alarmModelValues).then((alarm)=>{
        Alarm.findByIdAndUpdate({_id: alarm._id}, {deviceUserName: req.body.deviceUserName});
        Login.findOneAndUpdate({userName: req.body.deviceUserName}, 
            {$addToSet: {alarmIDs: JSON.stringify(alarm._id)}}, (err)=>{
            if(err){
                console.log(err+".............................error is here");
            }
        }).then((login)=>{
            const update = {deviceUserName: req.body.deviceUserName, supervisorAdmin: login.supervisorAdmin};
            Alarm.findByIdAndUpdate({_id: alarm._id}, update).then((result)=>{
                console.log(result);
            })
            var result = [];
            console.log("inside the login of alarms..........................................")
            result = help(alarm.time, alarm.date);
            min = result[0];
            hrs = result[1];
            date = result[2];
            month = result[3];
            console.log(min + " " + hrs + " " + date + " " + month);
            const job = schedule.scheduleJob(`${min || '00'} ${hrs || '00'} ${date || '00'} ${month || '00'} *`, ()=>{
                console.log("inside the job schedular or alarm....................................")
                var registrationToken = login.deviceTokens;
                query = Alarm.findById(alarm._id);          // check if alarm exists in database
                    if(query)
                    {
                        registrationToken.forEach(element=> {
                            element = element.slice(1);
                            element = element.slice(0, -1);
                            console.log(element);
                            var message = {
                                notification: {
                                    title: alarm.alarmName,
                                    body: 'Comment: '+alarm.comment 
                                },
                                token: element
                            };
                            console.log("passed message json setter ........................................"+message);
                            admin.messaging().send(message)
                            .then(()=>{
                                console.log('Notification sent: ');
                                console.log(alarm);
                                Histry.create(req.body.alarmModelValues).then((req, res)=>{
                                    console.log('Added to history.');
                                });
                                Alarm.findByIdAndDelete({_id: alarm._id}, req.body).then((his)=>{
                                    console.log("Alarm deleted from current database."+his)
                                })
                            })
                            .catch((err)=>{
                                console.log('Error in sending notification:----------------- ', err);
                            });
                        });
                    }
                    else
                    {
                        console.log('Deleted alarm did not send notification.');
                    }
            });
            });
            });
        });

app.post('/updateAlarm', (req, res)=>{
    console.log(req.body);
    console.log(req.query.id);
    console.log(req.query.deviceUserName);
    Alarm.findByIdAndUpdate({_id: req.query.id}, req.body).then((alarm)=>{
        Alarm.findByIdAndUpdate({_id: alarm._id}, {deviceUserName: req.query.deviceUserName}).then((res)=>{
            
        console.log('Alarm updated: '+ res);
        })
    })
})

app.post('/updatePassword', (req, res)=>{
    console.log(req.body);
    Login.findOneAndUpdate({userName: req.body.userName}, {password: req.body.password}).then((login)=>{
        console.log('Password updated.');
        res.sendStatus(200);
    })
})

app.post('/delete/current', (req, res)=>{
    Login.updateOne( {deviceUserName: req.body.deviceUserName},
        { $pullAll: {alarmIDs: req.body.id } } );
    Alarm.findByIdAndDelete({_id: req.body.id}, req.body).then((alarm)=>{
        res.status(200).send('Alarm deleted'+alarm);
    });
    console.log('Deleted alarm from database.');
});

app.post('/deleteUser', (req, res)=>{
    console.log(req.body);
    Login.findOne({userName: req.body.userName}).then((client)=>{
        if(client.accountType === 'admin')
        {
            Login.updateMany({supervisorAdmin: req.body.userName}, {supervisorAdmin: 'galaxy-developers'}).then(()=>{
                Alarm.deleteMany({deviceUserName: req.body.userName});
                Login.findOneAndDelete({userName: req.body.userName}).then(()=>{
                    console.log('Admin deleted.');
                    res.sendStatus(200);
                })
            })
        }
        else{
            Login.findOneAndUpdate({userName: client.supervisorAdmin}, {$pull:{clientList: client._id}}).then(()=>{
                Alarm.deleteMany({deviceUserName: req.body.userName});
                Login.findOneAndDelete({userName: req.body.userName}).then(()=>{
                    console.log('Client deleted.');
                    res.sendStatus(200);
                })
            })
        }
    })
});

app.post('/delete/history', (req, res)=>{
    Histry.findByIdAndDelete({_id: req.body.id}, req.body).then((alarm)=>{
        res.status(200).send('Alarm deleted'+alarm);
    });
    console.log('Deleted alarm from database.');
});

app.get('/authentication', (req, res) => {
    Login.findOne({userName: req.query.userName}).then((alarm, error)=>{
        if(error) {console.log(error+" the error is");}
        res.send(alarm.supervisorAdmin);
    })
})

app.post('/authentication', (req, res)=>{
    console.log("here =============================--------");
    const query = Login.where({userName: req.body.userName});
    query.findOne((err, login)=>{
        if (err){
            console.log(err);
            res.sendStatus(400);
        }
        if (login){
            if (login.password === req.body.password){
                console.log('Authentication successful.');
                res.status(200).send(login);
                console.log(login.id+ " login id");
                Login.findByIdAndUpdate({_id: mongoose.Types.ObjectId(login.id)}, {$inc: {numLogins: 1}})
                .then(()=>{
                    console.log('Number of logins increased.');
                })
            }
            else{
                console.log('Incorrect password');
                res.sendStatus(400);
            }
        }
        else{
            console.log('Username not returned.');
            res.sendStatus(404);
         }
        });
});

app.post('/logout', (req, res)=>{
    Login.findOneAndUpdate({userName: req.body.userId}, {$inc: {numLogins: -1}})
    .then((model, err)=>{
        if (err) {console.log(err)};
        console.log('Logged out.');
    })
});

app.get('/addUser', (req, res)=>{
    console.log("add User");
    res.render('addUser');
});

app.post('/addUser', (req,res)=>{
    console.log("add User "+ JSON.stringify(req.body));
    var loginDetails = Login(req.body.loginDetail);
    var supervisorAdmin = JSON.stringify(req.body.supervisorAdmin);
    console.log("Supervisor Admin"+ supervisorAdmin);
    const query = Login.where({userName: req.body.loginDetail.userName});
    query.findOne((err, login)=>{
        if (err){
            console.log(err+ " errorrrrrrrrrrr");
            res.sendStatus(400);
        }
        if (login){
            console.log('Username exists.');
            res.sendStatus(403);
        }
        else{
            if (req.body.userName!="" && req.body.password!="" && req.body.maxLogins!="")
            {
                Login.create(req.body.loginDetail).then((login)=>{
                    const update = {numLogins: 0, supervisorAdmin: req.body.supervisorAdmin};
                    Login.findOneAndUpdate({userName: login.userName}, 
                        update, (err,res)=>{
                        if(err){
                            console.log(err);
                        }
                     })
                     Login.findOneAndUpdate({userName: req.body.supervisorAdmin}, {$addToSet: {clientList: login._id}},
                        (err, res)=>{
                            if(err) {console.log(err);}
                            console.log('Client added to admin list of clients.');
                        });
                    // if(login.accountType==='client')
                    // {
                    //     Login.findOneAndUpdate({userName: login.userName}, 
                    //         {supervisorAdmin: req.supervisorAdmin}, (err,res)=>{
                    //         if(err){
                    //             console.log(err);
                    //         }
                    //     })
                    // }
                    res.status(200).send('User added to database.');
                 });
            }
            else{
                res.send('All fields are required.');
            }
         }
        }
    );
});


app.post('/test', (req, res)=>{
    console.log('request received.');
    var result = [];
    result = help(req.body.time, req.body.date);
    min = result[0];
    hrs = result[1];
    date = result[2];
    month = result[3];
    console.log(hrs + " " + min + " " + date + " " + month);
    const job = schedule.scheduleJob(`${min || '00'} ${hrs || '00'} ${date || '00'} ${month || '00'} *`, ()=>{
        console.log(req.body);
    });
});

function help(t, d){
    var res = [];
    var time = JSON.stringify(t);
    var date = JSON.stringify(d);
    console.log(time, date);
    if(time[time.length-2] === 'M'){
        timesegs = time.split(':');
        timesegs2 = timesegs[1].split(' ');
        res[1] = parseInt(timesegs[0].substring(1));
        res[0] = parseInt(timesegs2[0]);
        var temp = timesegs2[1].slice(0, -1);
        if (temp=='PM'){
            res[1] = (res[1]+12)%24;
        }
        else{
            var hr = parseInt(timesegs[0])+12;
        }
    }
    else{
        timesegs = time.split(':');
        res[1] = parseInt(timesegs[0].substring(1));
        res[0] = parseInt(timesegs[1]);
    }
    datesegs = date.split('-');
    res[2] = parseInt(datesegs[2].slice(0, -1));
    res[3] = parseInt(datesegs[1]);
    return res;
}

app.get('/alarm/urgent', (req, res) => {
    // Login.findOne({userName:req.query.deviceUserName}).then((user, err)=>{
    //     if(err) {console.log(err)};
    //     console.log(user.accountType);
    //     if(user.accountType === 'client')
    //     {
    //         Alarm.find({backGroundColor: 'Urgent', deviceUserName: req.query.deviceUserName}).then((alarms, err)=>{
    //             if(err) {console.log(err)};
    //             console.log(alarms);
    //             res.send(alarms);
    //           })
    //     }
    //     else if (user.accountType === 'admin')
    //     {
    //         console.log("admin --------------------------------");
    //         Alarm.find({backGroundColor: 'Urgent', supervisorAdmin: req.query.deviceUserName}).then((alarms, err)=>{
    //             if(err) {console.log(err)};
    //             console.log("====== yourgent"+alarms+" =============");
    //             res.send(alarms);
    //           })
    //     }
    //     // if (user.accountType === 'su-admin')
    //     else 
    //     {
    //         console.log("su-admin --------------------------------");
    //         Alarm.find({backGroundColor: 'Urgent'}).then((alarms, err)=>{
    //             if(err) {console.log(err)};
    //             res.send(alarms);
    //           })
    //     }
    //   })
        Alarm.find({backGroundColor: "Urgent", deviceUserName: req.query.deviceUserName}).then((alarms, err)=>{
            if(err) {console.log(err)};
            if(req.query.searchKeyWord === "")
            {
                res.send(alarms);
            }
            else{
                var result = [];
                alarms.forEach(alarm => {
                    if (alarm.alarmName.includes(req.query.searchKeyWord))
                    {
                        result.push(alarm);
                    }
                })
                if(result.length>0){
                res.send(result);
                }
                else{
                    res.status(404).send('No alarm matches the keyword.');
                }
            }
          });
});

app.get('/alarm/normal', (req, res) => {
    // Login.findOne({userName:req.query.deviceUserName}).then((user, err)=>{
    //     if(err) {console.log(err)};
    //     if(user.accountType === 'client')
    //     {
    //         Alarm.find({backGroundColor: "Normal", deviceUserName: req.query.deviceUserName}).then((alarms, err)=>{
    //             if(err) {console.log(err)};
    //             res.send(alarms);
    //           })
    //     }
    //     else if (user.accountType === 'admin')
    //     {
    //         Alarm.find({backGroundColor: "Normal", supervisorAdmin: req.query.deviceUserName}).then((alarms, err)=>{
    //             if(err) {console.log(err)};
    //             console.log(alarms);
    //             res.send(alarms);
    //           })
    //     }
    //     else 
    //     {
    //         Alarm.find({backGroundColor: "Normal"}).then((alarms, err)=>{
    //             if(err) {console.log(err)};
    //             res.send(alarms);
    //           })
    //     }
    //   })
    Alarm.find({backGroundColor: "Normal", deviceUserName: req.query.deviceUserName}).then((alarms, err)=>{
        if(err) {console.log(err)};
        if(req.query.searchKeyWord === "")
        {
            res.send(alarms);
        }
        else{
            var result = [];
            alarms.forEach(alarm => {
                if (alarm.alarmName.includes(req.query.searchKeyWord))
                {
                    result.push(alarm);
                }
            })
            if(result.length>0){
            res.send(result);
            }
            else{
                res.status(404).send('No alarm matches the keyword.');
            }
        }
      });
});

app.get('/alarm/pending', (req, res) => {
    // Login.findOne({userName:req.query.deviceUserName}).then((user, err)=>{
    //     if(err) {console.log(err)};
    //     if(user.accountType === 'client')
    //     {
    //         Alarm.find({backGroundColor: "Pending", deviceUserName: req.query.deviceUserName}).then((alarms, err)=>{
    //             if(err) {console.log(err)};
    //             console.log("====client== yopending"+alarms+" =============");
    //             res.send(alarms);
    //           })
    //     }
    //     else if (user.accountType === 'admin')
    //     {
    //         console.log("===="+req.query.deviceUserName);
    //         Alarm.find({backGroundColor: "Pending", supervisorAdmin: req.query.deviceUserName}).then((alarms, err)=>{
    //             if(err) {console.log(err)};
    //             console.log("===admin=== yopending"+alarms+" =============");
    //             res.send(alarms);
    //           })
    //     }
    //     else
    //     {
    //         Alarm.find({backGroundColor: "Pending"}).then((alarms, err)=>{
    //             if(err) {console.log(err)};
    //             res.send(alarms);
    //           })
    //     }
    //   })
    Alarm.find({backGroundColor: "Pending", deviceUserName: req.query.deviceUserName}).then((alarms, err)=>{
        if(err) {console.log(err)};
        if(req.query.searchKeyWord === "")
        {
            res.send(alarms);
        }
        else{
            var result = [];
            alarms.forEach(alarm => {
                if (alarm.alarmName.includes(req.query.searchKeyWord))
                {
                    result.push(alarm);
                }
            })
            if(result.length>0){
            res.send(result);
            }
            else{
                res.status(404).send('No alarm matches the keyword.');
            }
        }
      });
});

app.get('/admin', (req, res)=>{
    Login.find({accountType: 'admin'}).then((result, err)=>{
        if(err) {console.log(err)};
            res.send(result);
    })
});

app.get('/adminPassword', (req, res)=>{
    console.log("here "+ req.query.userName);
    Login.findOne({userName: req.query.userName}).then((result)=>{
        console.log(result.password);
        res.send(result.password);
    });
});

app.get('/clientList', (req, res)=>{
    Login.find({supervisorAdmin: req.query.deviceUserName}, '_id userName').then((clients)=>{
        res.send(clients);
    })
});