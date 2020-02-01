var express = require('express');
var app = express();
var apn = require('apn');

var FCM = require('fcm-node');
var serverKey = 'AIzaSyAR7soGZPPOkDROmH0zXOPlp_rIEVmRomg'; //put your server key here
var fcm = new FCM(serverKey);

const port = process.env.PORT || 7188;
app.get('/', function (req, res) {
  res.send("Go to Hellllllllllllll----------------" + new Date().getTime());
});

app.listen(port, function (error) {
  if (error) {
    console.error(error)
  } else {
    console.info("Listening on port %s. Open up http://localhost:%s/ in your browser.", port, port)
  }
})

app.get('/sendpushios', function (req, res) {
  var options = {
    cert: __dirname + '/cert.pem',
    key: __dirname + '/key.pem'
  };
  var apnConnection = new apn.Connection(options);

  var myDevice = new apn.Device("c2de1ee2022587d8d14b33bc8cedbac8e2e6e0ffde6105514cc13410a4c68123");

  var note = new apn.Notification();

  note.expiry = Math.floor(Date.now() / 1000) + 3600;
  note.badge = 3;
  note.sound = "ping.aiff";
  // note.alert = "\uD83D\uDCE7 \u2709 You have a new message";
  // note.payload = { 'messageFrom': 'Caroline' };
  note.alert = "Hello";
  note.payload = { 'messageFrom': 'Amit' };
  apnConnection.pushNotification(note, myDevice);

  return res.json({ success: "true" });
  // res.send("Go to Hellllllllllllll----------------"+new Date().getTime());
});

app.get('/sendpushandroid', function (req, res) {

  var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
    to: 'fEvqSQI08Lk:APA91bEk2uVGneYsqnf7dZ2yg1fXdg2gBSV5eK040xsO4t5LbjdyeY2LduPJ44S_b27OOAOdtVwu8ot7bZ4bUCacX4SxEcMT31e4e4NWLyNZzNcA0pXzHHsbKoD2HFV0C9p6sv5o-EKn',
    //collapse_key: 'your_collapse_key',

    notification: {
      title: 'Title of your push notification',
      body: 'Body of your push notification'
    },

    data: {  //you can send only notification or only data(or include both)
      my_key: 'my value',
      my_another_key: 'my another value'
    }
  };
  fcm.send(message, function (err, response) {
    if (err) {
      return res.json({ error: "true" });
    } else {
      console.log("Successfully sent with response: ", response);
      return res.json({ success: "true" });
    }
  });
  //return res.json({ success: "true" });
  // res.send("Go to Hellllllllllllll----------------"+new Date().getTime());
});
