const winstorywriter = require('../models/winstory/winstory-writer-model');
const getDb = require('../database/db').getDb;
const oracledb = require('oracledb');
const axios = require('axios');

exports.saveWinstory = (req, res) => {
    //console.log'saveWinstory');
    let winStory = {
        WINSTORY_NAME: req.body.winstory_name,
        WINSTORY_CUSTOMER_NAME: req.body.winstory_customer_name,
        WINSTORY_DEAL_CYCLE_TIME: req.body.winstory_deal_cycle_time,
        WINSTORY_DEAL_SIZE: req.body.winstory_deal_size,
        WINSTORY_PARTNER: req.body.winstory_partner,
        WINSTORY_RENEWAL: req.body.winstory_renewal,
        WINSTORY_APPLICATION_INSTALL: req.body.winstory_application_install,
        WINSTORY_IMPERATIVE: req.body.winstory_imperative,
        WINSTORY_REPS_SE: req.body.winstory_reps_se,
        WINSTORY_CUSTOMER_IMPACT: req.body.winstory_customer_impact,
        WINSTORY_BUSSINESS_DRIVER: req.body.winstory_bussiness_driver,
        WINSTORY_SALES_PROCESS: req.body.winstory_sales_process,
        WINSTORY_LESSON_LEARNT: req.body.winstory_lesson_learnt,
        WINSTORY_STATUS: "Live",
        WINSTORY_CREATED_BY: req.body.winstory_created_by,
        WINSTORY_USECASE: req.body.winstory_usecase,
        WINSTORY_CHANNEL: req.body.winstory_channel,
        WINSTORY_FISCAL_QUARTER: req.body.winstory_fiscal_quarter,
        WINSTORY_THUMBNAIL: req.body.winstory_thumbnail,
        WINSTORY_LOGO: req.body.winstory_logo,
        WINSTORY_SOLUTION_USECASE: req.body.winstory_solution_usecase,
        WINSTORY_COMPETIION: req.body.winstory_competiion,
        MAPPED_FILTERS: req.body.mapped_filters,
        LINKS: req.body.links,
        WINSTORY_CREATED_ON: req.body.created_on,
        WINSTORY_OTHER_FILTER: req.body.winstory_other_filter,
        WINSTORY_CONSULTING_Q1: req.body.WINSTORY_CONSULTING_Q1,
        WINSTORY_CONSULTING_Q2: req.body.WINSTORY_CONSULTING_Q2,
        WINSTORY_CONSULTING_Q3: req.body.WINSTORY_CONSULTING_Q3,
        WINSTORY_CONSULTING_Q4: req.body.WINSTORY_CONSULTING_Q4
    }

    //console.logJSON.stringify(winStory));
    winstorywriter.createWinstory(req.headers.host, winStory, res);

}

exports.updateWinstory = (req, res) => {

    let winStory = {
        WINSTORY_ID: req.body.winstory_id,
        WINSTORY_NAME: req.body.winstory_name,
        WINSTORY_CUSTOMER_NAME: req.body.winstory_customer_name,
        WINSTORY_DEAL_CYCLE_TIME: req.body.winstory_deal_cycle_time,
        WINSTORY_DEAL_SIZE: req.body.winstory_deal_size,
        WINSTORY_PARTNER: req.body.winstory_partner,
        WINSTORY_RENEWAL: req.body.winstory_renewal,
        WINSTORY_APPLICATION_INSTALL: req.body.winstory_application_install,
        WINSTORY_IMPERATIVE: req.body.winstory_imperative,
        WINSTORY_REPS_SE: req.body.winstory_reps_se,
        WINSTORY_CUSTOMER_IMPACT: req.body.winstory_customer_impact,
        WINSTORY_BUSSINESS_DRIVER: req.body.winstory_bussiness_driver,
        WINSTORY_SALES_PROCESS: req.body.winstory_sales_process,
        WINSTORY_LESSON_LEARNT: req.body.winstory_lesson_learnt,
        WINSTORY_STATUS: "Live",
        WINSTORY_CREATED_BY: req.body.winstory_created_by,
        WINSTORY_USECASE: req.body.winstory_usecase,
        WINSTORY_CHANNEL: req.body.winstory_channel,
        WINSTORY_FISCAL_QUARTER: req.body.winstory_fiscal_quarter,
        WINSTORY_THUMBNAIL: req.body.winstory_thumbnail,
        WINSTORY_LOGO: req.body.winstory_logo,
        WINSTORY_SOLUTION_USECASE: req.body.winstory_solution_usecase,
        WINSTORY_COMPETIION: req.body.winstory_competiion,
        MAPPED_FILTERS: req.body.mapped_filters,
        LINKS: req.body.links,
        WINSTORY_CREATED_ON: req.body.created_on,
        WINSTORY_OTHER_FILTER: req.body.winstory_other_filter,
        WINSTORY_CONSULTING_Q1: req.body.WINSTORY_CONSULTING_Q1,
        WINSTORY_CONSULTING_Q2: req.body.WINSTORY_CONSULTING_Q2,
        WINSTORY_CONSULTING_Q3: req.body.WINSTORY_CONSULTING_Q3,
        WINSTORY_CONSULTING_Q4: req.body.WINSTORY_CONSULTING_Q4
    }

    //console.logJSON.stringify(winStory));
    winstorywriter.saveWinstory(req.headers.host, winStory, res);
}


exports.updateview = (req, res) => {
    const winstoryId = req.body.winstoryId;
    const viewed_by_email = req.body.viewed_by_email;
    const viewed_by_userame = req.body.viewed_by_username;
    const viewed_on = req.body.viewed_on;
    //console.logwinstoryId + " - " + viewed_by_email + " - " + viewed_by_userame + " - " + viewed_on);
    winstorywriter.updateViewForWinstory(winstoryId, viewed_by_email, viewed_by_userame, viewed_on).then(result => {
        res.json(result);
    })
}
exports.postWinStoryComment = (req, res) => {
    const commentId = req.body.commentId;
    const winstoryId = req.body.winstoryId
    const comment = req.body.comment
    const commentBy = req.body.commentBy
    const commentByUserName = req.body.commentByUserName
    //console.log(req)
    winstorywriter.uploadCommentByWinStory(req.body, winstoryId, comment, commentBy, commentId, commentByUserName).then(result => {
        res.json(result);
    })
}
exports.postWinStoryLike = (req, res) => {
    let asset_like_count = 0;
    let action;
    const assetId = req.body.winstoryId;
    const likeBy = req.body.likeBy;
    const likeByUserName = req.body.likeByUserName;
    const connection = getDb();
    connection.execute(`Select count(*) "like_count" from ASSET_WINSTORY_LIKES where LIKE_BY=:LIKE_BY and WINSTORY_ID=:ASSET_ID`, [likeBy, assetId],
        {
            outFormat: oracledb.OBJECT
        }).then(result => {
            //console.log(result.rows[0].like_count)
            asset_like_count = result.rows[0].like_count;
            if (asset_like_count === 0) {
                action = "insert";
                winstorywriter.uploadLikeByWinStory(assetId, likeBy, likeByUserName, action).then(result => {
                    res.json(result);
                })
            }
            else {
                action = "delete"
                winstorywriter.uploadLikeByWinStory(assetId, likeBy, likeByUserName, action).then(result => {
                    res.json(result);
                })
            }
        })
}

exports.getSocialData = (req, res) => {
    //console.log("Asset : " + req.body.winstoryId + " USER ID: " + req.body.userId);

    winstorywriter.getSocialDataByWinStoryID(req.headers.host, req.body.winstoryId, req.body.userId).then(result => {
        res.json(result);
    })
}
exports.deleteAllWinStoryContent = (req, res) => {
    winstorywriter.deleteWinsStoryById(req.params.winstoryId)
        .then(result => {
            res.json(result);
        })
}
exports.saveSEAssistance = (req, res) => {
    console.log("Saving asset demo request");
    winstorywriter.SEAssistance(req.body, res);
}