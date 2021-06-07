const tags = require('../models/tag-model');
exports.getParentTagsctr = (req, res) => {

    tags.getParentTags(req)
        .then(result => {
            res.json(result)
        })
        .catch(err => {
            res.json(err)
        })
}
exports.getchildTagsctr = (req, res) => {    
    const filter_Parent_Id = req.params.parentid;
    tags.getChildTags(req,filter_Parent_Id)
        .then(result => {
            res.json(result)
        })
        .catch(err => {
            res.json(err)
        })
}
exports.newTag = (req, res) => {
    console.log('newTag request data controller');
    //console.log(JSON.stringify(req.body));
    tags.addNewTag(req.body, req.headers.host)
        .then(result => {
            res.json(result)
        })
        .catch(err => {
            res.json(err)
        })
}
exports.editTag = (req, res) => {
    admin.editTagbyId(req.body, req.headers.host)
        .then(result => {
            res.json(result)
        })
        .catch(err => {
            res.json(err)
        })
}