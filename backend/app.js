var express = require('express');
// var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const Dbconnect = require('./database/db');
const getDb = require('./database/db').getDb;
const worker = require('./utility/worker');
const oracledb = require('oracledb');
const cors = require('cors');
const fileUpload = require('express-fileupload');

var log4js = require('log4js');

// var uniqid = require('uniqid');
var SimpleOracleDB = require('simple-oracledb');
const bodyParser = require('body-parser');
SimpleOracleDB.extend(oracledb);

var assetrouter = require('./routes/assetRoute');
var winstoryrouter = require('./routes/winstoryRoute');
var userrouter = require('./routes/userRoute');
var governancerouter = require('./routes/governanceRoute');
var adminrouter = require('./routes/adminRoute');
let port=8001;

var app = express();
// // view engine setup
// app.use(bodyParser.json());
app.use(bodyParser.json({ limit: '100mb', extended: true }))
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }))
app.use(cors());
app.use(fileUpload());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(express.static(__dirname + '/public'));
app.use(express.static('/mnt/ahfs'));
app.use('/asset', assetrouter);
app.use('/winstory', winstoryrouter);
app.use('/user', userrouter);
app.use('/governance', governancerouter);
app.use('/admin', adminrouter);

app.use(log4js.connectLogger(log4js.getLogger("http"), { level: 'debug' }));

// catch 404 and forward to error handler
app.get('/test', (req, res) => {
  res.json("App is working")
});


Dbconnect.Dbconnect().then(res => {
  console.log(res);
  try {
    const connection = getDb();
    connection.query(`SELECT count(username) FROM dba_users`, {},
      {
        outFormat: oracledb.OBJECT
      },
    ).then(resp => {
      console.log("DB intiated : " + resp);
    })
  } catch (error) {
    console.log("Connection probbing is done. . . "+JSON.stringify(error));
  }

})
  .catch(err => console.log(err))

module.exports = app;