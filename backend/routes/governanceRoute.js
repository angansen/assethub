const governanceController=require('../controllers/governance-controller')
var express = require('express');
var router = express.Router();

router.get('/assets/:user_roles',governanceController.getAssets)
router.post('/postreviewnote',governanceController.addAssetReviewNote)

module.exports=router;