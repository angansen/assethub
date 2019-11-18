const adminController = require('../controllers/admin-controller')
var express = require('express');
var router = express.Router();

router.get('/alladminfilters', adminController.getFilters);

router.post('/addnewfilter', adminController.addFilter);
router.post('/editFilter', adminController.editFilter);
router.delete('/deletefilter', adminController.deletefilter);
router.post('/mapfilters', adminController.mapFilter);
router.post('/unmapfilters', adminController.unMapFilter);
router.post('/remapfilters', adminController.reMapFilter);
router.post('/promote', adminController.promote);


module.exports = router;