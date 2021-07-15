const Asset = require('../models/asset-model');
const banner = require('../models/banner-model');
const email = require('../models/email-notification');
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

const getAssetDetailsAndOwnerDetails = (asset) => {
    // console.log("generating notification. . . " + JSON.stringify(asset));
    let sql = '';
    const connection = getDb();
    /**
     * When approvalLevel 1 send notification to the asset owner and manager
     * When approvalLevel 0/2 send notification to the asset owner,their manager and reviewer
     */
    let currentReviewer = asset.activityByUser;
    sql = `select a.asset_id,b.user_role,b.user_email,b.user_manager_email 
        from asset_details a,asset_user b 
        where a.asset_owner=b.user_email and a.asset_id=:0`;

    connection.query(sql, [asset.id], {
        outFormat: oracledb.OBJECT
    }).then(data => {
        data = data[0];
        console.log(JSON.stringify(data));

        let assetowner = data.USER_EMAIL;
        let receipients = `${assetowner},${data.USER_MANAGER_EMAIL}`;

        //create email OBJECT
        let notification = {
            to: receipients,
            id: asset.id,
            assetstatus: asset.status,
            approvallevel: asset.approvalLevel,
            host: asset.host
        };



        console.log(JSON.stringify(data));
        console.log("Manager: "+data.USER_MANAGER_EMAIL);
        console.log(data.USER_ROLE.includes("reviewer"));
        let reviewers = "";

        if (data.USER_ROLE.includes("reviewer")) {
            // if the owner is a reviewer 
            // send notification to all the reviewers

            sql = `select user_email from asset_user where user_role like '%reviewer%'`;
            connection.query(sql, {}, {
                outFormat: oracledb.OBJECT
            }).then(reviewersrecords => {
                // console.log(JSON.stringify(data.rows));
                
                reviewersrecords.filter(element => {

                    reviewers += reviewers.trim().length > 0 ? "," + element.USER_EMAIL : element.USER_EMAIL;
                });
                // console.log(reviewers);
                notification.to = reviewers;
                try {
                    // despatch notifications for the Manager

                    // compile email subject and body
                    notification.subject = `New Asset has been submitted for Governance review`;
                    notification.body = `Hi Governance Team, 
                        <br>Asset - <a href="https://${asset.host}/details/?${notification.id}&Governance=Y">here</a> has been submitted for Governance review before publising.`;

                    notification.to = data.USER_MANAGER_EMAIL;
                    try {

                        // email.initiateAssetStatusEmail(notification);
                    } catch (err) {
                        console.log(JSON.stringify(err));
                    }
                    // despatch notification for the Asset owner

                    // Compile email body and subject for the submitter
                    notification.subject = `Your asset has been queued for Governance review`;
                    notification.body = `Dear Submitter, 
                        <br><br>Thank you for submitting your asset. It has been moved to the asset approval queue.
                        <br><br>You can find the link to your asset - <a href="https://${asset.host}/create?${notification.id}&MyASSET=Y">here</a>.
                        
                        <br><br>For more information on AssetHub and the Governance process, please visit the Confluence page - <a href="https://confluence.oraclecorp.com/confluence/display/NACCTO/Asset+Hub+Guidance?src=contextnavpagetreemode">here</a>`;

                    notification.to = assetowner;
                    try {

                        email.initiateAssetStatusEmail(notification);
                    } catch (err) {
                        console.log(JSON.stringify(err));
                    }

                } catch (err) {
                    console.log(JSON.stringify(err));
                }

            })

        } else {
            // if the owener is an user

            // despatch notifications for the respective manager

            // compile email subject and body
            notification.subject = `An asset has been submitted for your review`;
            notification.body = `Hello, 
                        <br><br>An asset has been submitted for review by ${assetowner}.
                        <br><br>To review the asset, please click - <a href="https://${asset.host}/details/?${notification.id}&Governance=Y">here</a>.
                        <br><br>For more information on AssetHub and the Governance process, please visit the Confluence page - <a href="https://confluence.oraclecorp.com/confluence/display/NACCTO/Asset+Hub+Guidance?src=contextnavpagetreemode">here</a>`;

            notification.to = data.USER_MANAGER_EMAIL;
            try {

                email.initiateAssetStatusEmail(notification);
            } catch (err) {
                console.log(JSON.stringify(err));
            }

            // despatch notification for the Asset owner

            // Compile email body and subject for the submitter
            notification.subject = `Your Asset has been queued for Manager Review`;
            notification.body = `<Dear Submitter, 
            <br><br>Thank you for submitting your asset. It has been moved to the asset approval queue.
            <br><br>You can find the link to your asset - <a href="https://${asset.host}/create?${notification.id}&MyASSET=Y">here</a>.
            
            <br><br>For more information on AssetHub and the Governance process, please visit the Confluence page - <a href="https://confluence.oraclecorp.com/confluence/display/NACCTO/Asset+Hub+Guidance?src=contextnavpagetreemode">here</a>`;

            notification.to = assetowner;
            try {

                email.initiateAssetStatusEmail(notification);
            } catch (err) {
                console.log(JSON.stringify(err));
            }
        }



        // if (asset.approvalLevel.includes('1')) {
        //     sql = `select user_email from asset_user where user_role like '%reviewer%'`;
        //     connection.execute(sql, {}, {
        //         outFormat: oracledb.OBJECT
        //     }).then(data => {
        //         // console.log(JSON.stringify(data.rows));
        //         let reviewers = `${assetowner}`;
        //         data.rows.filter(element => {

        //             reviewers += "," + element.USER_EMAIL;
        //         });
        //         // console.log(reviewers);
        //         notification.to = reviewers;
        //         try {
        //             email.initiateAssetStatusEmail(notification);
        //         } catch (err) {
        //             console.log(JSON.stringify(err));
        //         }

        //     })
        // } else {
        //     try {

        //         email.initiateAssetStatusEmail(notification);
        //     } catch (err) {
        //         console.log(JSON.stringify(err));
        //     }
        // }
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
                            asset_name: asset_details[0].ASSET_ID,
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


const getuserByEmail = (email) => {
    const connection = getDb();
    /**
     * When approvalLevel 1 send notification to the asset owner and manager
     * When approvalLevel 0/2 send notification to the asset owner,their manager and reviewer
     */
    sql = `select * from asset_user where user_email=:0`;
    return connection.query(sql, [email], {
        outFormat: oracledb.OBJECT
    })
}


exports.postAsset = (req, res) => {
    let type = req.header('type');
    // type= type==undefined||type==null||type.trim().length==0?"Saved":"Pending Review";


    if (type == undefined || type == null || type.trim().length == 0 || type.trim() == 'save') {
        type = 'Saved';
    } else if (type.trim() == 'submit') {
        type = 'Pending Review';
    } else {
        type = 'Saved';
    }
    console.log("STATE ASSET :::: " + type);

    const assetId = null;
    // console.log(req.body);
    // const title = req.body.title;
    // console.log(title);
    const description = req.body.description;
    // console.log(description);
    // const userCase = req.body.userCase;
    const customer = req.body.customer;
    const createdBy = req.headers.oidc_claim_sub;
    const createdDate = new Date();
    const serviceid = req.body.serviceid;
    // const oppId = req.body.oppId;
    const thumbnail = req.body.thumbnail != undefined && req.body.thumbnail.length > 0 ? req.body.thumbnail : "tagsicon/Others.png";
    const modifiedDate = new Date();
    const modifiedBy = null;
    const video_link = req.body.video_link;
    const owner = req.headers.oidc_claim_sub;
    // const location = req.body.location;
    let filters = req.body.filters;
    console.log("Filter length: " + JSON.stringify(req.body));
    if (filters.length > 1) {
        const expiryDate = req.body.expiryDate != undefined ? req.body.expiryDate : "12";
        // const asset_architecture_description = req.body.asset_architecture_description

        console.log(" --- >>> " + createdBy);
        const windata = {};
        windata.WIN_ECA = req.body.WIN_ECA != undefined ? req.body.WIN_ECA : "";
        windata.WIN_REGID = req.body.WIN_REGID != undefined ? req.body.WIN_REGID : "";
        windata.WIN_FISCAL_YR = req.body.WIN_FISCAL_YR != undefined ? req.body.WIN_FISCAL_YR : "";
        windata.WIN_MEMBERS = req.body.WIN_MEMBERS != undefined ? req.body.WIN_MEMBERS : "";
        windata.WIN_SOLUTION_SOLD = req.body.WIN_SOLUTION_SOLD != undefined ? req.body.WIN_SOLUTION_SOLD : "";
        windata.WIN_COSUMING_DATE = req.body.WIN_COSUMING_DATE != undefined ? req.body.WIN_COSUMING_DATE : "";
        windata.WIN_GOLIVE_ON = req.body.WIN_GOLIVE_ON != undefined ? req.body.WIN_GOLIVE_ON : "";
        windata.WIN_DEAL_CYCLE = req.body.WIN_DEAL_CYCLE != undefined ? req.body.WIN_DEAL_CYCLE : "";
        windata.WIN_RENEWAL = req.body.WIN_RENEWAL != undefined ? req.body.WIN_RENEWAL : "";
        windata.WIN_CUSTOMER_PERSONA = req.body.WIN_CUSTOMER_PERSONA != undefined ? req.body.WIN_CUSTOMER_PERSONA : "";
        windata.WIN_REF_LANG_INCL_IN_CONTRACT = req.body.WIN_REF_LANG_INCL_IN_CONTRACT != undefined ? req.body.WIN_REF_LANG_INCL_IN_CONTRACT : "";
        windata.WIN_BUSINESS_IMPACT = req.body.WIN_BUSINESS_IMPACT != undefined ? req.body.WIN_BUSINESS_IMPACT : "";
        windata.WIN_SALES_PROCESS_TEAMS = req.body.WIN_SALES_PROCESS_TEAMS != undefined ? req.body.WIN_SALES_PROCESS_TEAMS : "";
        windata.WIN_LESSONS_LEARNED = req.body.WIN_LESSONS_LEARNED != undefined ? req.body.WIN_LESSONS_LEARNED : "";
        windata.WIN_CUSTOMER_BUSINESS_CHALLANGES = req.body.WIN_CUSTOMER_BUSINESS_CHALLANGES != undefined ? req.body.WIN_CUSTOMER_BUSINESS_CHALLANGES : "";
        windata.WIN_TCV_ARR = req.body.WIN_TCV_ARR != undefined ? req.body.WIN_TCV_ARR+"" : "0";
        windata.ASSET_APPROVAL_LVL = req.body.ASSET_APPROVAL_LVL != undefined ? req.body.ASSET_APPROVAL_LVL : 1;

        let assetCreatedEmailSql = `select  user_email,user_name,ASSET_DESCRIPTION from asset_user ,asset_details where user_role='reviewer' and asset_id=:0  and user_location in(
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

        var asset = new Asset(assetId, description, customer,
            createdBy, createdDate, serviceid,
            thumbnail, modifiedDate,
            modifiedBy, filters, links, expiryDate, video_link, owner, windata);


        asset.save(type).then(result => {
            let creationResult = result
            res.json(creationResult);

            let assetObj = {
                status: 'Pending Review',
                activityByUser: owner,
                approvalLevel: windata.ASSET_APPROVAL_LVL,
                reviewNote: null,
                host: req.headers.host,
                id: creationResult.Asset_ID
            };


            if (type != 'Saved') {
                getAssetDetailsAndOwnerDetails(assetObj);
            }
            // sendEmailOnAssetCreation(result.Asset_ID, owner, assetCreatedEmailSql, assetCreatedEmailOptions, 'create')
            //     .then(result => {
            //         console.log(result)
            //     })
        })
            .catch(err => {
                err.status = "FAILED";
                res.status(500).json(err);
                console.log(err)
            });
    } else {
        res.status(500).json({ status: "FAILED", msg: "Please select Solution Asset Category" });
        console.log()
    }

}


exports.postEditAsset = (req, res) => {
    let assetCreatedEmailSql = `select  user_email,user_name,ASSET_DESCRIPTION from asset_user ,asset_details where user_role='reviewer' and asset_id=:0  and user_location in(
        select user_location from asset_user where user_email in 
        (  select regexp_substr(asset_owner,'[^,]+', 1, level) from (select asset_owner from asset_details where asset_id=:0)
        connect by regexp_substr(asset_owner, '[^,]+', 1, level) is not null) and user_location is not null) `;
    let assetCreatedEmailOptions = [];
    let type = req.header('type');


    if (type == undefined || type == null || type.trim().length == 0 || type.trim() == 'save') {
        type = 'Saved';
    } else if (type.trim() == 'submit') {
        type = 'Pending Review';
    } else {
        type = 'Saved';
    }
    console.log("BODY:   "+JSON.stringify(req.body));
    const assetId = req.body.assetId;

    const description = req.body.description;
    const customer = req.body.customer;
    const createdBy = req.body.owner;
    const createdDate = req.body.createdDate;
    const serviceid = req.body.serviceid;
    const thumbnail = req.body.thumbnail;
    const modifiedDate = new Date();
    const modifiedBy = req.headers.oidc_claim_sub;
    let filters = req.body.filters;
    const expiryDate = req.body.expiryDate;
    const video_link = req.body.video_link;
    const owner = req.body.owner;
    const approval_level = req.body.ASSET_APPROVAL_LVL;
    let windata = {};
    windata.WIN_ECA = req.body.WIN_ECA != undefined ? req.body.WIN_ECA : "";
    windata.WIN_REGID = req.body.WIN_REGID != undefined ? req.body.WIN_REGID : "";
    windata.WIN_FISCAL_YR = req.body.WIN_FISCAL_YR != undefined ? req.body.WIN_FISCAL_YR : "";
    windata.WIN_MEMBERS = req.body.WIN_MEMBERS != undefined ? req.body.WIN_MEMBERS : "";
    windata.WIN_SOLUTION_SOLD = req.body.WIN_SOLUTION_SOLD != undefined ? req.body.WIN_SOLUTION_SOLD : "";
    windata.WIN_COSUMING_DATE = req.body.WIN_COSUMING_DATE != undefined ? req.body.WIN_COSUMING_DATE : "";
    windata.WIN_GOLIVE_ON = req.body.WIN_GOLIVE_ON != undefined ? req.body.WIN_GOLIVE_ON : "";
    windata.WIN_DEAL_CYCLE = req.body.WIN_DEAL_CYCLE != undefined ? req.body.WIN_DEAL_CYCLE : "";
    windata.WIN_RENEWAL = req.body.WIN_RENEWAL != undefined ? req.body.WIN_RENEWAL : "";
    windata.WIN_CUSTOMER_PERSONA = req.body.WIN_CUSTOMER_PERSONA != undefined ? req.body.WIN_CUSTOMER_PERSONA : "";
    windata.WIN_REF_LANG_INCL_IN_CONTRACT = req.body.WIN_REF_LANG_INCL_IN_CONTRACT != undefined ? req.body.WIN_REF_LANG_INCL_IN_CONTRACT : "";
    windata.WIN_BUSINESS_IMPACT = req.body.WIN_BUSINESS_IMPACT != undefined ? req.body.WIN_BUSINESS_IMPACT : "";
    windata.WIN_SALES_PROCESS_TEAMS = req.body.WIN_SALES_PROCESS_TEAMS != undefined ? req.body.WIN_SALES_PROCESS_TEAMS : "";
    windata.WIN_LESSONS_LEARNED = req.body.WIN_LESSONS_LEARNED != undefined ? req.body.WIN_LESSONS_LEARNED : "";
    windata.WIN_CUSTOMER_BUSINESS_CHALLANGES = req.body.WIN_CUSTOMER_BUSINESS_CHALLANGES != undefined ? req.body.WIN_CUSTOMER_BUSINESS_CHALLANGES : "";
    windata.WIN_TCV_ARR = req.body.WIN_TCV_ARR != undefined ? req.body.WIN_TCV_ARR+"" : "0";
    windata.ASSET_APPROVAL_LVL = approval_level;


    if (filters.length > 1) {
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
        var asset = new Asset(assetId, description, customer,
            createdBy, createdDate, serviceid, thumbnail, modifiedDate,
            modifiedBy, filters, links, expiryDate, video_link, owner, windata);
        asset.save(type).then(result => {
            let updationResult = result
            res.json(updationResult);
            let assetObj = {
                status: 'Pending Review',
                activityByUser: owner,
                approvalLevel: approval_level,
                reviewNote: null,
                host: req.headers.host,
                id: assetId
            };


            if (type != 'Saved') {
                getAssetDetailsAndOwnerDetails(assetObj);
            }        }).catch(err => {
            console.log("AssetUpdation error : " + err);
            //res.status(500).json({ status: "FAILED", msg: err });
        });
    } else {
        res.status(500).json({ status: "FAILED", msg: "Please select Solution Asset Category" });
        console.log()
    }
}



exports.postEditAssetTest = (req, res) => {
    const assetId = req.body.assetId;
    // const title = req.body.title
    // console.log(title);
    const description = req.body.description;
    console.log(description);
    // const userCase = req.body.userCase;
    const customer = req.body.customer;
    const createdBy = req.body.createdBy;
    const createdDate = req.body.createdDate;
    const serviceid = req.body.serviceid;
    // const oppId = req.body.oppId;
    const thumbnail = req.body.thumbnail;
    const modifiedDate = new Date();
    const modifiedBy = req.body.modifiedBy;
    let filters = req.body.filters;
    const expiryDate = req.body.expiryDate;
    const video_link = req.body.video_link;
    // const location = req.body.location;
    const owner = req.body.owner;
    // const asset_architecture_description = req.body.asset_architecture_description
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
    var asset = new Asset(assetId, description, customer,
        createdBy, createdDate, serviceid, thumbnail, modifiedDate,
        modifiedBy, filters, links, expiryDate, video_link, owner);
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
    const user_name = req.headers.oidc_claim_name;
    const user_email = req.headers.oidc_claim_sub;
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
            Asset.uploadDoc(req, data, uploadFiles)
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

exports.uploadBanner = (req, res) => {
    console.log("In uploading banner funtion . . .");
    banner.uploadBannerDoc(req).then(result => {
        res.send(result);
    }).catch(result => {
        console.log(JSON.stringify(result));
        res.status(500).json({ msg: "Error while uploading banner Image # No filed found" });
    })

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
    let email = req.headers.oidc_claim_sub;

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

    let host = req;
    if (limit === '-1') {
        console.log("-1 limit if")
        const connection = getDb();
        connection.execute(`SELECT count(*) total from ASSET_DETAILS where asset_status='Live'`, {},
            {
                outFormat: oracledb.OBJECT
            },
        ).then(result => {
            limit = result.rows[0].TOTAL;
            console.log("new Limit" + limit);
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


exports.getAllPreferredAssets = (req, res) => {
    const user_email = req.headers.oidc_claim_sub;
    let order = req.header('order');
    let sortBy = req.header('sortBy');
    Asset.fetchPreferedAssets(req, user_email, sortBy, order)
        .then(list => {
            res.send(list);
        })
}



exports.getAssetById = (req, res) => {
    const user_email = req.headers.oidc_claim_sub;
    Asset.fetchAssetsById(req.params.assetId, req, user_email).then(result => {
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
    const user_email = req.headers.oidc_claim_sub
    Asset.deleteSearchHistory(user_email).then(result => {
        res.json(result);
    })
}
exports.deleteDocsByIds = (req, res) => {
    // const user_email = req.headers.oidc_claim_sub
    Asset.deleteDocsById(req.header("linkids")).then(result => {
        res.json(result);
    }).catch(err => {
        res.status(500).json(err);
    })
}
exports.getBannerDetails = (req, res) => {
    Asset.getBannerCounts().then(bannerCounts => {
        banner.getBannerLinks().then(data => {
            bannerCounts.bannerlinks = data;
            res.send(bannerCounts);
        })
        // res.json(result);
    })
}


exports.getAllFilters = (req, res) => {
    console.log("PLATFORM >>> " + req.header("platform"));
    const user_email = req.headers.oidc_claim_sub
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
    const user_email = req.headers.oidc_claim_sub
    Asset.getFavAssets(user_email, req.headers.host).then(result => {
        res.json(result)
    })
}


exports.getAllAssetsByLob = (req, res) => {
    const lob = req.params.lob
    const user_email = req.headers.oidc_claim_sub
    let order = req.header('order');
    let sortBy = req.header('sortBy');
    console.log("Host >>> " + req.headers.host);
    Asset.getAssetsByLob(lob, req, user_email, sortBy, order).then(result => {
        res.json(result)
    })
}



exports.getAllAssetsByLob2 = (req, res) => {
    const user_email = req.headers.oidc_claim_sub
    const connection = getDb();
    connection.execute(`Select USER_LOB from ASSET_USER where USER_EMAIL=:USER_EMAIL`, [user_email],
        {
            outFormat: oracledb.OBJECT
        },
    )
        .then(user_lob => {
            console.log(user_lob.rows[0])
            if (user_lob.rows[0]) {
                Asset.getAssetsByLob(user_lob.rows[0].USER_LOB, req, user_email).then(result => {
                    res.json(result)
                })
            }
            else {
                res.json({ msg: "Not a valid user" })
            }
        })
}

exports.getUserAssets = (req, res) => {
    const user_email = req.headers.oidc_claim_sub;
    Asset.getMyAssets(user_email, req).then(result => {
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