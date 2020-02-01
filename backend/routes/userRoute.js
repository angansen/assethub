const userController=require('../controllers/user-controller');
const worker=require('../utility/worker');
var express = require('express');
var router = express.Router();


router.post('/save/',userController.saveUserDetails);
router.post('/findbyemail/',userController.findUserByEmail);
router.post('/uploadprofileimage/:platform/:email',userController.uploadProfileImage);
router.post('/requestdemo/',userController.saveRequestDemo);
router.post('/captureactivity/:platform/:type/:name/:email',userController.captureuserLogin);
router.delete('/:email',userController.deleteUser);



//to populate users from LDAP
router.get('/getprofileimage/:platform/:email',userController.getProfileImage);
router.get('/ldap',userController.getLdapUsers);
router.get('/ldapcompletelist',worker.triggerWorkers);
router.get('/ldapupdate',worker.triggerWorkeronce);
router.get('/getactivitybyuser',userController.fetchActivityByemail);
router.get('/notification',userController.retriveNotifications);



module.exports = router;
