const tagsController=require('../controllers/tags-controller')
var express = require('express');
var router = express.Router();
router.get('/parenttags',tagsController.getParentTagsctr);
router.get('/childtags/:parentid',tagsController.getchildTagsctr);
//POST
router.post('/newtag', tagsController.newTag);
router.post('/edittag', tagsController.editTag);
module.exports=router;