const winstoryreaderController = require('../controllers/winstory-reader-controller');
const winstorywriterController = require('../controllers/winstory-writer-controller')
var express = require('express');
var router = express.Router();

// GET
router.get('/allwinstoryfilters', winstoryreaderController.getAllFilters);
router.get('/getAllWinStoryByFilters', winstoryreaderController.getAllAssetsByFilters);
// router.get('/getAllWinStoryByFilters2', winstoryreaderController.getAllAssetsByFilters);

router.get('/mywinstory', winstoryreaderController.getUserWinstory);
router.get('/winstorylobs', winstoryreaderController.getWinStoryLobsList);
router.get('/winstoryimperative', winstoryreaderController.winstoryimperative);
router.get('/winstorysolutionusecase', winstoryreaderController.winstorysolutionusecase);

router.get('/winfavourites', winstoryreaderController.getAllFavWins);
router.get('/allPrefferedWins/:user_email', winstoryreaderController.getAllPreferredWins1);
router.get('/filterWinsbylob', winstoryreaderController.getAllWinsByLob);
router.get('/:winstoryId', winstoryreaderController.getWinStoryById);

// Delete
router.delete('/deleteWinstorybyId/:winstoryId', winstorywriterController.deleteAllWinStoryContent);


// POST
router.post('/save', winstorywriterController.saveWinstory);
router.post('/view', winstorywriterController.updateview);
router.post('/uploadComment/', winstorywriterController.postWinStoryComment);
router.post('/uploadLike/', winstorywriterController.postWinStoryLike);
router.post('/winstorySocialData', winstorywriterController.getSocialData);
router.post('/seassistance/', winstorywriterController.saveSEAssistance);
// PUT
router.put('/save', winstorywriterController.updateWinstory);

module.exports = router;
