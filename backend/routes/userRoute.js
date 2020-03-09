const userController=require('../controllers/user-controller');
const worker=require('../utility/worker');
var express = require('express');
var router = express.Router();


router.post('/save/',userController.saveUserDetails);
router.post('/findbyemail/',userController.findUserByEmail);
router.post('/uploadprofileimage/:platform/:email',userController.uploadProfileImage);
router.post('/requestdemo/',userController.saveRequestDemo);
router.post('/captureactivity/:platform/:type/:name/:email',userController.captureuserLogin);
router.post('/updateUserTable',userController.updateUserRepos);


//to populate users from LDAP
router.get('/getprofileimage/:platform/:email',userController.getProfileImage);
router.get('/ldap',userController.getLdapUsers);
router.get('/ldapcompletelist',worker.triggerWorkers);
router.get('/ldapupdate',worker.triggerWorkeronce);
router.get('/getactivitybyuser',userController.fetchActivityByemail);
router.get('/notification/:email',userController.retriveNotifications);
router.get('/keywords/:email',userController.fetchAllSearchedKeywordsByUser);
router.get('/updateuserlob',userController.updateUserLob);
router.get('/truncateuserdata',userController.removeAllUserData);

// PUT
router.put('/notification/:email/:id',userController.markNotificationRead);


// DELETE
router.delete('/notification/:email/:id',userController.markNotificationDelete);
router.delete('/keywords/:email',userController.deleteKeywordsByUser);
router.delete('/:email',userController.deleteUser);



module.exports = router;
