const adminController = require('../controllers/admin-controller')
var express = require('express');
var router = express.Router();

//GET
router.get('/alladminfilters', adminController.getFilters);

//POST
router.post('/addnewfilter', adminController.addFilter);
router.post('/editFilter', adminController.editFilter);
router.post('/mapfilters', adminController.mapFilter);
router.post('/unmapfilters', adminController.unMapFilter);
router.post('/remapfilters', adminController.reMapFilter);
router.post('/promote', adminController.promote);

router.post('/visitorsreports', adminController.visitors_Reports);

//Push Notificatios
router.post('/adddevice', adminController.addDeviceToken);
//DELETE
router.delete('/deletefilter', adminController.deletefilter);
router.delete('/deleteparent/:parentname', adminController.deleteparentbyname);

module.exports = router;