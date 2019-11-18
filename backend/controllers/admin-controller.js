const admin = require('../models/admin-model');

exports.getFilters = (req, res) => {
    console.log('addFilter request data controller');
    //console.log(JSON.stringify(req.body));
    admin.getAllFilters(req.body, req.headers.host)
        .then(result => {
            res.json(result)
        })
        .catch(err => {
            res.json(err)
        })
}
exports.addFilter = (req, res) => {
    console.log('addFilter request data controller');
    //console.log(JSON.stringify(req.body));
    admin.addNewFilter(req.body, req.headers.host)
        .then(result => {
            res.json(result)
        })
        .catch(err => {
            res.json(err)
        })
}

exports.deletefilter = (req, res) => {
    const filter_id = req.body.filter_id;
    admin.deleteFilterbyId(filter_id, req.headers.host)
        .then(result => {
            res.json(result)
        })
        .catch(err => {
            res.json(err)
        })
}
exports.editFilter = (req, res) => {
    admin.editFilterbyId(req.body, req.headers.host)
        .then(result => {
            res.json(result)
        })
        .catch(err => {
            res.json(err)
        })
}

exports.mapFilter = (req, res) => {
    console.log('Admin get filters' + JSON.stringify(res.body));
    admin.mapFilters(req.body, req.headers.host)
        .then(result => {
            res.json(result)
        })
        .catch(err => {
            res.json(err)
        })
}
exports.unMapFilter = (req, res) => {
    console.log('Admin get filters' + res);
    admin.unMapFilters(req.body.filter_id)
        .then(result => {
            res.json(result)
        })
        .catch(err => {
            res.json(err)
        })
}
exports.reMapFilter = (req, res) => {
    console.log('Admin get filters' + res);
    admin.reMapFilters(req.body)
        .then(result => {
            res.json(result)
        })
        .catch(err => {
            res.json(err)
        })
}
exports.promote = (req, res) => {
    let type = req.body.assetId.split('-')[0];
    if (type == 'AH') {
        admin.promoteAsset(req.body)
            .then(result => {
                res.json(result)
            })
            .catch(err => {
                res.json(err)
            })
    } else if (type == 'WS') {
        req.body.winstoryId = req.body.assetId;
        admin.promoteWins(req.body)
            .then(result => {
                res.json(result)
            })
            .catch(err => {
                res.json(err)
            })
    } else {
        res.json('Please provide proper type')
    }
}