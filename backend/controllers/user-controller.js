const user = require('../models/user-model');
const getDb = require('../database/db').getDb;
const oracledb = require('oracledb');
const axios = require('axios');




exports.saveUserDetails = (req, res) => {
    console.log("validating user. . .");
    user.saveUser(req.body, res);
}

exports.findUserByEmail = (req, res) => {
    console.log("finding user. . . " + req.body.email);
    user.findUserByEmail(req.body.email, res);
}

exports.uploadProfileImage = (req, res) => {
    console.log("Updating profile image for . . . " + req.params.email);
    user.saveProfileImage(req.headers.host, req.body.image, req.params.platform, req.params.email, res);
}

exports.getProfileImage = (req, res) => {
    console.log("Fetching user profile image. . . : ");
    user.getProfileImage(req.headers.host, req.params.email, res);
}

exports.deleteUser = (req, res) => {
    console.log("Deleting record for " + req.params.email);
    user.deleteUser(req.params.email, res);
}

exports.saveRequestDemo = (req, res) => {
    console.log("Saving asset demo request");
    user.saveRequestForDemo(req.body, res);
}

exports.getLdapUsers = (req, res) => {
    user.getLdapInfo()
        .then(data => {
            res.json(data)
        })
}

exports.captureuserLogin = (req, res) => {
    user.saveuserlogin(req.params, res);
}

exports.fetchActivityByemail = (req, res) => {
    user.fetchuseractivity(res);
}

exports.registerPushNotification = (notification, user) => {
    console.log("Registering notification step 1");
    user.createNotification(notification, user);
}

exports.retriveNotifications = (req, res) => {
    user.fetchNotifications(req.params, res);
}

exports.markNotificationRead = (req, res) => {
    user.markNotificationRead(req.params, res);
}

exports.markNotificationDelete = (req, res) => {
    user.markNotificationDelete(req.params, res);
}

exports.getLdapUsersComplete = (req, res) => {
    user.getLdapInfoComplete()
        .then(data => {
            res.json(data)
        })
}

exports.fetchAllSearchedKeywordsByUser = (req, res) => {
    user.findAllSearchedKeywordsByUser(req.params).then(data => {
        res.send(data);
    })
}

exports.deleteKeywordsByUser=(req,res)=>{
    user.deleteKeyWordsByUser(req.body,req.params).then(data =>{
        res.send(data);
    })
}

exports.updateUserRepos=(req,res)=>{
    user.updateRawUsers(req.body.items).then(data =>{
        res.send(data);
    })
}
exports.updateUserLob=(req,res)=>{
    user.updateUserLob().then(data =>{
        res.send(data);
    })
}

exports.removeAllUserData=(req,res)=>{
    user.truncateAllUserData().then(data=>{
        res.send(data);
    })
}