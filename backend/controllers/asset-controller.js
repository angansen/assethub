const Asset = require('../models/asset-model');
const getDb = require('../database/db').getDb;
const oracledb = require('oracledb');
const axios = require('axios');
const worker = require('../utility/worker');

const getOwnerManagerEmail = (assetId) => {
    const connection = getDb();
    let getOwnerManagerSql = `select distinct user_manager_email from asset_user where user_manager_email is not null and user_email in
    (select distinct regexp_substr(asset_owner,'[^,]+', 1, level) from (select asset_owner from asset_details where asset_id=:0)  where asset_id=:0
    connect by regexp_substr(asset_owner, '[^,]+', 1, level) is not null)`;
    let getOwnerManagerOptions = [];
    getOwnerManagerOptions.push(assetId);
    return connection.execute(getOwnerManagerSql, getOwnerManagerOptions, {
        outFormat: oracledb.OBJECT
    })
}

const getOwnerEmails = (assetId) => {
    const connection = getDb();
    let rectificationAssetOwnerSql = `select user_name,user_email from asset_user where user_email in(
    select regexp_substr(asset_owner,'[^,]+', 1, level) from (select asset_owner from asset_details where asset_id=:0)
    connect by regexp_substr(asset_owner, '[^,]+', 1, level) is not null)`;
    let rectificationAssetOwnerOptions = [];
    rectificationAssetOwnerOptions.push(assetId);
    return connection.execute(rectificationAssetOwnerSql, rectificationAssetOwnerOptions, {
        outFormat: oracledb.OBJECT
    })
}

const sendEmailOnAssetCreation = (assetId, asset_owner, assetCreatedEmailSql, assetCreatedEmailOptions, status) => {
    let asset_reviewer_name, asset_name, asset_description, asset_details
    return new Promise((resolve, reject) => {
        const connection = getDb();
        assetCreatedEmailOptions.push(assetId)
        console.log("asset :> " + assetId);
        let asset_reviewer_email;
        connection.query(assetCreatedEmailSql, assetCreatedEmailOptions,
            {
                outFormat: oracledb.OBJECT
            })
            .then(result => {
                asset_details = result;
                console.log('Result:' + result)
                if (result.length > 0) {
                    console.log("multiple reviewers")
                    console.log(JSON.stringify(result));
                    asset_reviewer_name = result.map(o => o.USER_NAME)
                    asset_reviewer_name = asset_reviewer_name.join(';')
                    asset_reviewer_email = result.map(o => o.USER_EMAIL)
                    asset_reviewer_email = asset_reviewer_email.join(';')
                }
                else if (result[0] != undefined) {
                    console.log("single reviewer")
                    console.log(JSON.stringify(result[0]));
                    asset_reviewer_name = result[0].USER_NAME;
                    asset_reviewer_email = result[0].USER_EMAIL;
                } else {
                    reject("No reviewer for the location");
                }
                return asset_reviewer_email;
            })
            .then(result => {
                getOwnerEmails(assetId)
                    .then(result => {
                        if (result.rows.length > 0) {
                            asset_owners_name = result.rows.map(o => o.USER_NAME)
                            asset_owners_name = asset_owners_name.join(',')
                        }
                        else {
                            asset_owners_name = result.rows[0].USER_NAME
                        }
                        console.log(asset_reviewer_name, status)
                        axios.post('https://apex.oracle.com/pls/apex/ldap_info/asset/sendemailonassetcreation/sendemail', {
                            asset_reviewer_name: asset_reviewer_name,
                            asset_reviewer_email: asset_reviewer_email,
                            asset_name: asset_details[0].ASSET_TITLE,
                            asset_description: asset_details[0].ASSET_DESCRIPTION,
                            asset_owner: asset_owners_name,
                            status: status
                        })
                            .then(response => {
                                resolve(response)
                            })
                    })
                    .catch(err => {
                        console.log(err)

                    })
            })
    })
}


exports.postAsset = (req, res) => {
    let type = req.header('type');
    // type= type==undefined||type==null||type.trim().length==0?"Saved":"Pending Review";

    
    if(type==undefined||type==null||type.trim().length==0||type.trim()=='save'){
        type='Saved';
    }else if(type.trim()=='submit'){
        type='Pending Review';
    }else{
        type='Saved';
    }
    console.log("STATE ASSET :::: "+type);

    const assetId = null;
    // console.log(req.body);
    const title = req.body.title;
    // console.log(title);
    const description = req.body.description;
    // console.log(description);
    const userCase = req.body.userCase;
    const customer = req.body.customer;
    const createdBy = req.body.createdBy;
    const createdDate = new Date();
    const scrmId = req.body.scrmId;
    const oppId = req.body.oppId;
    const thumbnail = req.body.thumbnail;
    const modifiedDate = new Date();
    const modifiedBy = null;
    const video_link = req.body.video_link;
    const owner = req.body.owner.replace(/ /g, '');
    const location = req.body.location;
    let filters = req.body.filters;
    const expiryDate = req.body.expiryDate;
    const asset_architecture_description = req.body.asset_architecture_description
    let assetCreatedEmailSql = `select  user_email,user_name,asset_title,ASSET_DESCRIPTION from asset_user ,asset_details where user_role='reviewer' and asset_id=:0  and user_location in(
        select user_location from asset_user where user_email in 
        (  select regexp_substr(asset_owner,'[^,]+', 1, level) from (select asset_owner from asset_details where asset_id=:0)
        connect by regexp_substr(asset_owner, '[^,]+', 1, level) is not null) and user_location is not null) `;
    let assetCreatedEmailOptions = [];

    // console.log(filters)

    if (!req.body.links) {
        req.body.links = null;
    }
    if (req.body.links !== null) {
        req.body.links.forEach(link => {
            if (!link.DEPLOY_STATUS) {
                link.DEPLOY_STATUS = 0;
            }
        })
    }
    const links = req.body.links;

    var asset = new Asset(assetId, title, description, userCase, customer,
        createdBy, createdDate, scrmId,
        oppId, thumbnail, modifiedDate,
        modifiedBy, filters, links, expiryDate, video_link, location, owner, asset_architecture_description);

    asset.save(type).then(result => {
        let creationResult = result
        res.json(creationResult);
        sendEmailOnAssetCreation(result.Asset_ID, owner, assetCreatedEmailSql, assetCreatedEmailOptions, 'create')
            .then(result => {
                console.log(result)
            })
    })
        .catch(err => {
            err.status = "FAILED";
            res.status(500).json(err);
            console.log(err)
        });;

}

exports.postAssetTest = (req, res) => {
    const assetId = null;
    console.log(req.body);

    const title = req.body.title
    console.log(title);
    const description = req.body.description;
    console.log(description);

    const userCase = req.body.userCase;
    const customer = req.body.customer;
    const createdBy = req.body.createdBy;
    const createdDate = new Date();
    const scrmId = req.body.scrmId;
    const oppId = req.body.oppId;
    const thumbnail = req.body.thumbnail;
    const modifiedDate = new Date();
    const modifiedBy = null;
    const video_link = req.body.video_link;
    const owner = req.body.owner;
    const location = req.body.location;
    let filters = req.body.filters;
    const expiryDate = req.body.expiryDate;
    const asset_architecture_description = req.body.asset_architecture_description
    console.log(filters)

    if (!req.body.links) {
        req.body.links = null;
    }
    if (req.body.links !== null) {
        req.body.links.forEach(link => {
            if (!link.DEPLOY_STATUS) {
                link.DEPLOY_STATUS = 0;
            }
        })
    }
    const links = req.body.links;

    var asset = new Asset(assetId, title, description, userCase, customer,
        createdBy, createdDate, scrmId,
        oppId, thumbnail, modifiedDate,
        modifiedBy, filters, links, expiryDate, video_link, location, owner, asset_architecture_description);

    asset.saveTest().then(result => {
        res.json(result);
    }).catch(err => {
        res.status(500).json({ status: "FAILED", msg: err });
    });;

}



exports.postEditAsset = (req, res) => {
    let assetCreatedEmailSql = `select  user_email,user_name,asset_title,ASSET_DESCRIPTION from asset_user ,asset_details where user_role='reviewer' and asset_id=:0  and user_location in(
        select user_location from asset_user where user_email in 
        (  select regexp_substr(asset_owner,'[^,]+', 1, level) from (select asset_owner from asset_details where asset_id=:0)
        connect by regexp_substr(asset_owner, '[^,]+', 1, level) is not null) and user_location is not null) `;
    let assetCreatedEmailOptions = [];
    let type = req.header('type');

   
    if(type==undefined||type==null||type.trim().length==0||type.trim()=='save'){
        type='Saved';
    }else if(type.trim()=='submit'){
        type='Pending Review';
    }else{
        type='Saved';
    }
    console.log("STATE ASSET :::: "+type);
    const assetId = req.body.assetId;
    const title = req.body.title
    // console.log(title);
    const description = req.body.description;
    // console.log(description);
    const userCase = req.body.userCase;
    const customer = req.body.customer;
    const createdBy = req.body.createdBy;
    const createdDate = req.body.createdDate;
    const scrmId = req.body.scrmId;
    const oppId = req.body.oppId;
    const thumbnail = req.body.thumbnail;
    const modifiedDate = new Date();
    const modifiedBy = req.body.modifiedBy;
    let filters = req.body.filters;
    const expiryDate = req.body.expiryDate;
    const video_link = req.body.video_link;
    const location = req.body.location;
    const owner = req.body.owner.replace(/ /g, '');
    const asset_architecture_description = req.body.asset_architecture_description
    // console.log(filters)
    if (!req.body.links) {
        req.body.links = null;
    }
    if (req.body.links !== null) {
        req.body.links.forEach(link => {
            if (!link.DEPLOY_STATUS) {
                link.DEPLOY_STATUS = 0;
            }
        })
    }
    const links = req.body.links;
    var asset = new Asset(assetId, title, description, userCase, customer,
        createdBy, createdDate, scrmId,
        oppId, thumbnail, modifiedDate,
        modifiedBy, filters, links, expiryDate, video_link, location, owner, asset_architecture_description);
    asset.save(type).then(result => {
        let updationResult = result
        res.json(updationResult);
        sendEmailOnAssetCreation(assetId, owner, assetCreatedEmailSql, assetCreatedEmailOptions, 'update').then(result => {
            console.log(result)
        })
            .catch(err => {
                console.log(err)
            })
    }).catch(err => {
        console.log(err)
        //res.status(500).json({ status: "FAILED", msg: err });
    });
}



exports.postEditAssetTest = (req, res) => {
    const assetId = req.body.assetId;
    const title = req.body.title
    console.log(title);
    const description = req.body.description;
    console.log(description);
    const userCase = req.body.userCase;
    const customer = req.body.customer;
    const createdBy = req.body.createdBy;
    const createdDate = req.body.createdDate;
    const scrmId = req.body.scrmId;
    const oppId = req.body.oppId;
    const thumbnail = req.body.thumbnail;
    const modifiedDate = new Date();
    const modifiedBy = req.body.modifiedBy;
    let filters = req.body.filters;
    const expiryDate = req.body.expiryDate;
    const video_link = req.body.video_link;
    const location = req.body.location;
    const owner = req.body.owner;
    const asset_architecture_description = req.body.asset_architecture_description
    console.log(filters)
    if (!req.body.links) {
        req.body.links = null;
    }
    if (req.body.links !== null) {
        req.body.links.forEach(link => {
            if (!link.DEPLOY_STATUS) {
                link.DEPLOY_STATUS = 0;
            }
        })
    }
    const links = req.body.links;
    var asset = new Asset(assetId, title, description, userCase, customer,
        createdBy, createdDate, scrmId,
        oppId, thumbnail, modifiedDate,
        modifiedBy, filters, links, expiryDate, video_link, location, owner, asset_architecture_description);
    asset.saveTest().then(result => {
        res.json(result);
    }).catch(err => {
        res.status(500).json({ status: "FAILED", msg: err });
    });
}


exports.postAssetComment = (req, res) => {
    const commentId = req.body.commentId;
    const assetId = req.body.assetId
    const comment = req.body.comment
    const commentBy = req.body.commentBy
    const commentByUserName = req.body.commentByUserName
    //console.log(req)
    Asset.uploadCommentByAssetId(req.body, assetId, comment, commentBy, commentId, commentByUserName).then(result => {
        res.json(result);
    })
}

exports.postAssetLike = (req, res) => {
    const assetId = req.body.assetId;
    const likeBy = req.body.likeBy;
    const likeByUserName = req.body.likeByUserName

    likeId = req.body.likeId;
    console.log("Like Request body", req)
    Asset.uploadLikeByAssetId(assetId, likeBy, likeId, likeByUserName).then(result => {
        res.json(result);
    })
}

exports.postAssetLike2 = (req, res) => {
    let asset_like_count = 0;
    let action;
    const assetId = req.body.assetId;
    const likeBy = req.body.likeBy;
    const likeByUserName = req.body.likeByUserName;
    const connection = getDb();
    connection.execute(`Select count(*) "like_count" from asset_likes where LIKE_BY=:LIKE_BY and ASSET_ID=:ASSET_ID`, [likeBy, assetId],
        {
            outFormat: oracledb.OBJECT
        }).then(result => {
            console.log(result.rows[0].like_count)
            asset_like_count = result.rows[0].like_count;
            if (asset_like_count === 0) {
                action = "insert";
                Asset.uploadLikeByAssetId2(assetId, likeBy, likeByUserName, action).then(result => {
                    res.json(result);
                })
            }
            else {
                action = "delete"
                Asset.uploadLikeByAssetId2(assetId, likeBy, likeByUserName, action).then(result => {
                    res.json(result);
                })
            }
        })

}


exports.postAssetView = (req, res) => {
    const assetId = req.body.assetId;
    const viewedBy = req.body.viewedBy;
    const viewed_by_userame = req.body.viewed_by_username;
    const viewed_on = req.body.viewed_on;
    Asset.addViewByAssetId(assetId, viewedBy, viewed_by_userame, viewed_on).then(result => {
        res.json(result);
    })
}



exports.getAllLocations = (req, res) => {
    Asset.getLocations().then(result => {
        res.json(result)
    })
}



exports.postPreference = (req, res) => {
    const filters = req.body.filters;
    const user_name = req.body.user_name;
    const user_email = req.body.user_email;
    let action;
    Asset.addUserPreference(user_name, user_email, filters).then(result => {
        res.json(result)
    })

}


exports.postAssetImage = (req, res) => {
    console.log(req.params.assetId)
    if (req.files) {
        console.log("FILE :" + req.files.file)
        console.log(req.body.fileDesc)
        console.log(req.header('type'))
        const type = req.header('type');
        const assetId = req.params.assetId
        const uploadFiles = req.files.file;
        let imageDescription = req.header('desc');
        if (!imageDescription) {
            imageDescription = '';
        }
        console.log(imageDescription)
        if (Object.keys(req.files.file).length == 0) {
            res.status(400).send('No files were uploaded.');
            return;
        }
        if (type === 'coverPhoto') {
            Asset.uploadImages(assetId, uploadFiles, imageDescription)
                .then(result => {
                    res.json(result)
                })
                .catch(err => {
                    console.log(err)
                    res.json(err)
                })
        }
        else if (type === 'thumbnail') {
            Asset.uploadThumbnail(assetId, uploadFiles)
                .then(result => {
                    res.json(result)
                })
                .catch(err => {
                    console.log(err)
                    res.status(500).json(err)
                })
        }
        else if (type === 'coverVideo') {
            Asset.uploadVideo(assetId, uploadFiles)
                .then(result => {
                    res.json(result)
                })
        }
    }
    else {
        console.log("FILE error :" + req.files)
        res.json("working");
    }
}
exports.postAssetDoc = (req, res) => {
    console.log(req.params.assetId)
    if (req.files) {
        console.log("FILE :" + req.files.file)
        console.log(req.header);
        console.log(req.body.fileDesc)
        console.log(req.header('type'))
        const type = req.header('type');
        const assetId = req.params.assetId
        const uploadFiles = req.files.file;
        var data = {
            assetId: req.params.assetId,
            LINK_DESCRIPTION: req.header('LINK_DESCRIPTION'),
            LINK_DESCRIPTION_DATA: req.header('LINK_DESCRIPTION_DATA'),
            LINK_REPOS_TYPE: req.header('LINK_REPOS_TYPE'),
            LINK_URL_TYPE: req.header('LINK_URL_TYPE')
        }
        let imageDescription = req.header('desc');
        if (!imageDescription) {
            imageDescription = '';
        }
        console.log(imageDescription)
        if (Object.keys(req.files.file).length == 0) {
            res.status(400).send('No files were uploaded.');
            return;
        } if (type === 'document') {
            console.log("Doc file size : " + uploadFiles.length);
            console.log("Doc file name : " + uploadFiles.name);
            Asset.uploadDoc(req.headers.host, data, uploadFiles)
                .then(result => {
                    res.json(result)
                })
        }
    }
    else {
        console.log("FILE:" + req.files)
        res.json("working");
    }
}

// exports.getAllAssets = (req, res) => {
//     const { offset, limit } = req.body;
//     console.log(offset, limit)
//     Asset.fetchAssets(req.headers.host, offset, limit).then(result => {
//         res.json(result);
//     });
// }

// exports.getAllAssetsBySearchString = (req, res) => {
//     const { offset, limit, searchString } = req.body;
//     console.log(searchString)
//     console.log(offset, limit)
//     Asset.fetchAssets(req.headers.host, offset, limit, searchString).then(result => {
//         res.json(result);
//     });
// }

exports.getAllAssetsByFilters = (req, res) => {
    // var obj = {};
    // obj.filters = [];
    let offset = req.header('offset');
    let limit = req.header('limit');
    let filters = req.header('filters');
    let searchString = req.header('searchString')
    let order = req.header('order');
    let sortBy = req.header('sortBy');
    let email = req.header('user_email');

    let activity = {
        filters: filters,
        email: email,
        searchtext: searchString
    }

    // console.log("============= Asset Controller Activity ==============")
    // console.log(JSON.stringify(activity));
    // console.log("================== Activity ==========================")

    try {
        worker.captureSearch(activity);
    } catch (err) {
        console.log("search activity log error");
    }

    console.log("Host:- " + req.headers.host);

    searchString = searchString == undefined ? "" : searchString;
    filters = filters == undefined ? [] : filters;

    let host = req.headers.host;
    if (limit === '-1') {
        console.log("-1 limit if")
        const connection = getDb();
        connection.execute(`SELECT count(*) total from ASSET_DETAILS where asset_status='Live'`, {},
            {
                outFormat: oracledb.OBJECT
            },
        ).then(result => {
            limit = result.rows[0].TOTAL;
            console.log("new Limit" + limit)
            Asset.fetchAssets(host, offset, limit, filters, searchString, sortBy, order, '', email).then(result => {
                res.json(result);
            })
        })

    }
    else {
        Asset.fetchAssets(host, offset, limit, filters, searchString, sortBy, order, '', email).then(result => {
            res.json(result);
        })
    }

}

// exports.getAllAssetsByFilters = (req, res) => {

//     // var obj = {};
//     // obj.filters = [];
//     let offset = req.header('offset');
//     let limit = req.header('limit');
//     let filters = req.header('filters');
//     let searchString = req.header('searchString')
//     let order = req.header('order');
//     let sortBy = req.header('sortBy');
//     let email = req.header('user_email');

//     let activity = {
//         filters: filters,
//         email: email,
//         searchtext: searchString
//     }

//     console.log("============= Asset Controller Activity ==============")
//     // console.log(JSON.stringify(activity));
//     // console.log("================== Activity ==========================")

//     try {
//         worker.captureSearch(activity);
//     } catch (err) {
//         console.log("search activity log error");
//     }

//     console.log("Host:- " + req.headers.host);

//     searchString = searchString == undefined ? "" : searchString;
//     filters = filters == undefined ? [] : filters;

//     let host = req.headers.host;
//     if (limit === '-1') {
//         const connection = getDb();
//         connection.execute(`SELECT count(*) total from ASSET_DETAILS where asset_status='Live'`, {},
//             {
//                 outFormat: oracledb.OBJECT
//             },
//         ).then(result => {
//             limit = result.rows[0].TOTAL;
//             Asset.fetchAssets3(host, offset, limit, filters, searchString, sortBy, order, email).then(result => {
//                 res.json(result);
//             })
//         })

//     }
//     else {
//         Asset.fetchAssets3(host, offset, limit, filters, searchString, sortBy, order, email).then(result => {
//             res.json(result);
//         })
//     }
// }
exports.getAllPreferredAssets = (req, res) => {
    const user_email = req.params.user_email;
    let order = req.header('order');
    let sortBy = req.header('sortBy');
    Asset.fetchPreferedAssets(req.headers.host, user_email, sortBy, order)
        .then(list => {
            res.send(list);
        })
}

// exports.getAllPreferredAssets = (req, res) => {
//     const offset = 0
//     let limit;
//     let filters = []
//     let userPreferencesArr = []
//     let searchString;
//     let order;
//     let sortBy;
//     const user_email = req.params.user_email;
//     let action = 'preferenceApi'
//     console.log(user_email)

//     const connection = getDb();
//     connection.execute(`Select ASSET_FILTER_ID from ASSET_PREFERENCES where USER_EMAIL=:USER_EMAIL`, [user_email],
//         {
//             outFormat: oracledb.OBJECT
//         },
//     )
//         .then(result => {
//             console.log("ROWS:", result.rows)
//             if (result.rows.length === 0) {
//                 res.json({ "ASSETS": [] })
//             }
//             else {

//                 result.rows.forEach(a => {

//                     let preferenceId = Object.values(a)
//                     userPreferencesArr.push(preferenceId[0]);
//                 })
//                 filters.push(userPreferencesArr.join(','))
//                 console.log("userPreferencesArr", filters)

//                 connection.execute(`SELECT count(*) total from ASSET_DETAILS`, {},
//                     {
//                         outFormat: oracledb.OBJECT
//                     },
//                 ).then(result => {
//                     limit = result.rows[0].TOTAL;
//                     console.log("new Limit" + limit)
//                     Asset.fetchAssets(req.headers.host, offset, limit, filters, searchString, sortBy, order, action).then(result => {
//                         res.json(result);
//                     })
//                 })
//             }
//         })

// }

exports.getAssetById = (req, res) => {
    const user_email = req.header("user_email")
    Asset.fetchAssetsById(req.params.assetId, req.headers.host, user_email).then(result => {
        res.json(result);
    })
}


exports.deleteUploadedImage = (req, res) => {
    Asset.deleteUploadedImageById(req.params.imageId)
        .then(result => {
            res.json(result);
        })
}

exports.deleteAllUploadedImage = (req, res) => {
    Asset.deleteAllUploadedImages(req.params.assetId)
        .then(result => {
            res.json(result);
        })
}

exports.deleteLink = (req, res) => {
    Asset.deleteUploadedLinkById(req.params.assetId, req.params.linkId)
        .then(result => {
            res.json(result);
        })
}


exports.deleteAllLinks = (req, res) => {
    Asset.deleteAllUploadedLinks(req.params.assetId)
        .then(result => {
            res.json(result);
        })
}


exports.deleteAllAssetContent = (req, res) => {
    Asset.deleteAssetById(req.params.assetId)
        .then(result => {
            res.json(result);
        })
}

exports.deleteMySearchHistory = (req, res) => {
    const user_email = req.header("user_email")
    Asset.deleteSearchHistory(user_email).then(result => {
        res.json(result);
    })
}
exports.deleteDocsByIds = (req, res) => {
    // const user_email = req.header("user_email")
    Asset.deleteDocsById(req.header("linkids")).then(result => {
        res.json(result);
    }).catch(err => {
        res.status(500).json(err);
    })
}
exports.getBannerDetails = (req, res) => {
    Asset.getBannerCounts().then(result => {
        res.json(result);
    })
}


exports.getAllFilters = (req, res) => {
    console.log("PLATFORM >>> " + req.header("platform"));
    const user_email = req.header("user_email")
    if (req.header("platform") != undefined && req.header("platform") == "w") {
        Asset.getFilters(user_email, req.headers.host, "w").then(result => {
            res.json(result);
        })
    } else {
        Asset.getFilters(user_email, req.headers.host, "m").then(result => {
            res.json(result);
        })
    }

}


exports.getAllFavAssets = (req, res) => {
    const user_email = req.header("user_email")
    Asset.getFavAssets(user_email, req.headers.host).then(result => {
        res.json(result)
    })
}


exports.getAllAssetsByLob = (req, res) => {
    const lob = req.params.lob
    const user_email = req.header("user_email")
    let order = req.header('order');
    let sortBy = req.header('sortBy');
    console.log("Host >>> " + req.headers.host);
    Asset.getAssetsByLob(lob, req.headers.host, user_email, sortBy, order).then(result => {
        res.json(result)
    })
}



exports.getAllAssetsByLob2 = (req, res) => {
    const user_email = req.params.user_email
    const connection = getDb();
    connection.execute(`Select USER_LOB from ASSET_USER where USER_EMAIL=:USER_EMAIL`, [user_email],
        {
            outFormat: oracledb.OBJECT
        },
    )
        .then(user_lob => {
            console.log(user_lob.rows[0])
            if (user_lob.rows[0]) {
                Asset.getAssetsByLob(user_lob.rows[0].USER_LOB, req.headers.host, user_email).then(result => {
                    res.json(result)
                })
            }
            else {
                res.json({ msg: "Not a valid user" })
            }
        })
}

exports.getUserAssets = (req, res) => {
    const user_email = req.header("user_email");
    Asset.getMyAssets(user_email, req.headers.host).then(result => {
        if (result.length > 0) {
            res.json(result);
        }
        else {
            res.json({ status: "No Assets Available" })
        }
    })
}

exports.getSocialData = (req, res) => {
    console.log("Asset : " + req.body.assetId + " USER ID: " + req.body.userId);

    Asset.getSocialDataByAssetId(req.headers.host, req.body.assetId, req.body.userId).then(result => {
        res.json(result);
    })
}


exports.submitfeedback = (req, res) => {
    Asset.savefeedback(req.params.email, req.params.assetid, req.params.feedback, res);
}
exports.getHelpAndSupport = (req, res) => {
    Asset.getHelpAndSupportModal().then(result => {
        if (result.length > 0) {
            res.json(result);
        }
        else {
            res.json({ status: "No Promo Available" })
        }
    })
}
exports.saveHelpAndSupport = (req, res) => {
    console.log(req.body)
    Asset.SaveHelpAndSupportModal(req.body).then(result => {
        res.json(result);
    })
}