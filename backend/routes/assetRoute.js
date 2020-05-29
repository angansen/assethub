const assetController = require('../controllers/asset-controller')
let express = require('express');
let router = express.Router();
/* GET home page. */
// router.get('/allAsDsets', assetController.getAllAssets);
router.get('/banner', assetController.getBannerDetails);
router.get('/myAssets', assetController.getUserAssets);
router.get('/helpandsupport', assetController.getHelpAndSupport);
// router.get('/allAssetsBySearchString', assetController.getAllAssetsBySearchString);
// router.get('/allAssetsFilters2', assetController.getAllAssetsByFilters);
router.get('/allAssetsFilters', assetController.getAllAssetsByFilters);
router.get('/allPrefferedAssets/:user_email', assetController.getAllPreferredAssets);
router.get('/allFilters', assetController.getAllFilters);
router.get('/favourites', assetController.getAllFavAssets);
router.get('/assetbylob/:lob', assetController.getAllAssetsByLob);
router.get('/filterassetbylob/:user_email', assetController.getAllAssetsByLob2);
router.get('/allLocations', assetController.getAllLocations);
router.get('/:assetId', assetController.getAssetById);



router.post('/', assetController.postAsset);
router.post('/testPost', assetController.postAssetTest);
router.post('/uploadImages/:assetId', assetController.postAssetImage)
router.post('/uploadDoc/:assetId', assetController.postAssetDoc);
//router.post('/likeasset/:action/:assetId/:useremail',assetController.likeUnlikeAsset)
//Social APIs
router.post('/uploadComment/', assetController.postAssetComment)
router.post('/uploadLike/', assetController.postAssetLike)
router.post('/addToFav/', assetController.postAssetLike2)
router.post('/views/', assetController.postAssetView)
router.post('/setPreferences/', assetController.postPreference)
router.post('/feedback/:email/:assetid/:feedback', assetController.submitfeedback)
router.post('/editAsset', assetController.postEditAsset);
router.post('/editAssetTest', assetController.postEditAssetTest);
router.post('/helpandsupport', assetController.saveHelpAndSupport);
router.post('/socialData', assetController.getSocialData);


router.delete('/deleteImages/:imageId', assetController.deleteUploadedImage)
router.delete('/deleteImages/:assetId/', assetController.deleteAllUploadedImage)
router.delete('/deleteLinks/:assetId/:linkId', assetController.deleteLink)
router.delete('/deleteLinks/:assetId/', assetController.deleteAllLinks)
router.delete('/deleteAssetbyId/:assetId', assetController.deleteAllAssetContent)
router.delete('/deleteMySearchHistory', assetController.deleteMySearchHistory)
router.delete('/deletelinksbyid', assetController.deleteDocsByIds)









module.exports = router;
