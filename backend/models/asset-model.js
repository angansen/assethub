const getDb = require('../database/db').getDb;
const doRelease = require('../database/db').getDb;
const worker = require('../utility/worker');
var uniqid = require('uniqid');
const oracledb = require('oracledb');
const path = require('path');
const emailnotification = require('./email-notification');
let stringSimilarity = require('string-similarity');

const generateFileName = (sampleFile, assetId, filesArray, imageDescription) => {
    let imgObject = {};
    let fname = sampleFile.name.split('.')[0];
    fname = fname.replace(/ /g, '');

    const ftype = sampleFile.name.split('.')[1];
    const uniqueId = uniqid();
    const finalFname = fname + uniqueId.concat('.', ftype);
    const uploadPath = path.join(__dirname, '../../../..', 'mnt/ahfs/', finalFname);
    var content = `${finalFname}`

    //var content=`http://localhost:3002/${finalFname}`
    imgObject.IMAGE_ID = uniqueId;
    imgObject.ASSET_ID = assetId;
    imgObject.IMAGE_NAME = finalFname;
    imgObject.IMAGEURL = content;
    imgObject.IMAGE_DESCRIPTION = imageDescription;
    filesArray.push(imgObject)
    imgObject = {}
    sampleFile.mv(uploadPath, function (err) {
        if (err) {
            return res.status(500).send(err);
        }
    })
    return filesArray;
}



const dynamicSort = (tAssets, sortBy, order) => {

    console.log("Asset Count :::: " + tAssets.length);

    if (sortBy && order === 'asc') {
        // //console.log("asc order")
        if (sortBy === 'ratings') {
            //  //console.log("sortBy ratings")
            tAssets.sort((a, b) => a.RATINGS.AVG_RATING > b.RATINGS.AVG_RATING ? 1 : -1);
        }
        else if (sortBy === 'createdDate') {
            tAssets.sort((a, b) => a.ASSET_CREATED_DATE > b.ASSET_CREATED_DATE ? 1 : -1);
        }
        else if (sortBy === 'likes') {
            tAssets.sort((a, b) => a.LIKES.LIKE_COUNT > b.LIKES.LIKE_COUNT ? 1 : -1);
        }
        else if (sortBy === 'views') {
            tAssets.sort((a, b) => a.VIEWS.VIEW_COUNT > b.VIEWS.VIEW_COUNT ? 1 : -1);
        }
    }
    else if (sortBy && order === 'desc') {
        if (sortBy === 'ratings') {
            tAssets.sort((a, b) => a.RATINGS.AVG_RATING < b.RATINGS.AVG_RATING ? 1 : -1);
        }
        else if (sortBy === 'createdDate') {
            tAssets.sort((a, b) => a.ASSET_CREATED_DATE < b.ASSET_CREATED_DATE ? 1 : -1);
        }
        else if (sortBy === 'likes') {
            tAssets.sort((a, b) => a.LIKES.LIKE_COUNT < b.LIKES.LIKE_COUNT ? 1 : -1);
        }
        else if (sortBy === 'views') {
            tAssets.sort((a, b) => a.VIEWS.VIEW_COUNT < b.VIEWS.VIEW_COUNT ? 1 : -1);
        }
    }
}
const getAssetsById = (assetId) => {
    const connection = getDb();
    return connection.query(`SELECT * from ASSET_DETAILS where ASSET_ID=:ASSET_ID`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}

const getRatingsById = (assetId) => {
    const connection = getDb();
    return connection.query(`SELECT * from ASSET_RATES where ASSET_ID=:ASSET_ID`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}


const getLinksById = (assetId) => {
    const connection = getDb();
    return connection.query(`SELECT * from ASSET_LINKS  where link_active='true' and ASSET_ID=:ASSET_ID`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}
const getPromoteById = (assetId, email) => {
    const connection = getDb();
    return connection.query(`SELECT * from ASSET_LOB_LEADER_PROMOTED_ASSETS  where ASSET_ID=:ASSET_ID and status=1`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}
const getImagesById = (assetId) => {
    const connection = getDb();
    return connection.query(`SELECT * from ASSET_IMAGES where ASSET_ID=:ASSET_ID`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}

// const getCommentsById=(assetId)=>{
//     const connection=getDb();
//     return connection.query(`SELECT * from ASSET_COMMENTS where ASSET_ID=:ASSET_ID`,[assetId],
//     {
//         outFormat:oracledb.OBJECT
//     })
// }

const getCommentsById = (assetId, host) => {
    const connection = getDb();
    return connection.query(`select COMMENT_ID,
    COMMENT_COMMENT,
    COMMENTBY,
    COMMENTON,
    ASSET_ID,
    COMMENT_USERNAME,
    case when USER_PROFILE_IMAGE is null then null
    else :0||USER_PROFILE_IMAGE
    end  USER_PROFILE_IMAGE
    from asset_comments c  full outer join asset_user u on (c.commentby=u.user_email)where ASSET_ID=:1`,
        ["http://" + host + "/", assetId],
        {
            outFormat: oracledb.OBJECT
        })
}


const getAssetFilterMapByIdandType = (assetId) => {
    const connection = getDb();
    return connection.query(`select m.filter_id,filter_type,f.filter_name from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where  ASSET_ID=:ASSET_ID`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}

const getSolutionAreasByAssetId = (assetId) => {
    const connection = getDb();
    return connection.query(`select m.filter_id,filter_type,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where  ASSET_ID=:ASSET_ID and filter_type='Solution Area'`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}

const getAssetTypesByAssetId = (assetId) => {
    const connection = getDb();
    return connection.query(`select m.filter_id,filter_type,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where  ASSET_ID=:ASSET_ID and filter_type='Asset Type'`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}
const getSalesPlayByAssetId = (assetId) => {
    const connection = getDb();
    return connection.execute(`select m.filter_id,filter_type,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where  ASSET_ID=:ASSET_ID and filter_type='Sales Play'`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}


const getIndustryByAssetId = (assetId) => {
    const connection = getDb();
    return connection.query(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where ASSET_ID=:ASSET_ID and filter_type='Industry'`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}


const getLikesByAssetId = (host, assetId) => {
    const connection = getDb();
    return connection.query(`select
    LIKE_ID,
    ASSET_ID,
    LIKE_BY,
    LIKE_CREATED,
    LIKE_USERNAME ,
    case when USER_PROFILE_IMAGE is null then null
    else '${host}'||USER_PROFILE_IMAGE
    end  USER_PROFILE_IMAGE
    from asset_likes l  full outer join asset_user u on (l.like_by=u.user_email)where ASSET_ID=:ASSET_ID`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}


const getLikesByAssetIdAndUserId = (assetId, userId) => {
    const connection = getDb();
    return connection.query(`select * from ASSET_LIKES where ASSET_ID=:ASSET_ID and LIKE_BY=:LIKE_BY`, [assetId, userId],
        {
            outFormat: oracledb.OBJECT
        })
}

module.exports = class Asset {
    constructor(assetId, title, description, usercase, customer, createdBy,
        createdDate, scrmId, oppId,
        thumbnail, modifiedDate, modifiedBy, filters, links, expiryDate, video_link, location, owner, asset_architecture_description, assetType) {
        this.assetId = assetId;
        this.title = title;
        this.description = description;
        this.usercase = usercase;
        this.customer = customer;
        this.createdBy = createdBy.toLowerCase();
        this.createdDate = createdDate;
        this.scrmId = scrmId;
        this.oppId = oppId;
        this.thumbnail = thumbnail;
        this.modifiedDate = modifiedDate;
        this.modifiedBy = modifiedBy;
        this.links = links;
        this.filters = filters;
        this.expiryDate = expiryDate;
        this.video_link = video_link;
        this.location = location;
        this.owner = owner.toLowerCase();
        this.asset_architecture_description = asset_architecture_description,
            this.asset_type = assetType
    }

    save() {

        return new Promise((resolve, reject) => {
            var assetid = this.assetId;
            var self = this;
            const connection = getDb();
            let filterObj = {};
            let filterArr = [];
            //console.log("------------------ SAVEING ASSET -----------------");
            //console.log(JSON.stringify(self));

            if (this.assetId) {

                //   //console.log("in edit mode")
                // //console.log(this.links)
                if (!this.filters) {
                    this.filters = []
                }
                if (this.filters.length > 1) {
                    this.filters.forEach(f => {
                        filterObj.FILTER_ASSET_MAP_ID = uniqid.process();
                        filterObj.FILTER_ID = f.Value;
                        filterObj.ASSET_ID = assetid;
                        filterArr.push(filterObj)
                        filterObj = {};
                    })
                }
                else if (this.filters.length === 1) {
                    filterObj.FILTER_ASSET_MAP_ID = uniqid.process();
                    filterObj.FILTER_ID = this.filters[0].Value;
                    filterObj.ASSET_ID = assetid;
                    filterArr.push(filterObj)
                }
                else {
                    filterArr = null;
                }
                const oj = this.links;
                if (!(oj === null)) {
                    oj.forEach(link => {
                        // linkObj={LINK_ID:uniqid.process(),ASSET_ID:assetid,...link}
                        // return linkObj
                        link.LINK_ID = uniqid.process();
                        link.ASSET_ID = self.assetId;
                    })
                }

                connection.transaction([
                    function firstAction() {
                        return connection.update(`UPDATE ASSET_DETAILS set 
            ASSET_TITLE=:ASSET_TITLE,
            ASSET_DESCRIPTION=:ASSET_DESCRIPTION,
            ASSET_USERCASE=:ASSET_USERCASE,
            ASSET_CUSTOMER=:ASSET_CUSTOMER,
            ASSET_CREATEDBY=:ASSET_CREATEDBY,
            ASSET_SCRM_ID=:ASSET_SCRM_ID,
            ASSET_OPP_ID=:ASSET_OPP_ID,
            ASSET_MODIFIED_DATE=:ASSET_MODIFIED_DATE,
            ASSET_MODIFIED_BY=:ASSET_MODIFIED_BY,
            ASSET_EXPIRY_DATE=:ASSET_EXPIRY_DATE,
	    ASSET_VIDEO_LINK=:ASSET_VIDEO_LINK,
        ASSET_LOCATION=:ASSET_LOCATION,
        ASSET_OWNER=:ASSET_OWNER,
        ASSET_STATUS=:ASSET_STATUS,
        ASSET_ARCHITECTURE_DESCRIPTION=:ASSET_ARCHITECTURE_DESCRIPTION,
        ASSET_TYPE=:ASSET_TYPE
             WHERE ASSET_ID=:ASSET_ID`,
                            [self.title, self.description, self.usercase, self.customer, self.createdBy.toLowerCase(),
                            self.scrmId, self.oppId, new Date(), self.modifiedBy, self.expiryDate, self.video_link, self.location, self.owner.toLowerCase(), 'Pending Review', self.asset_architecture_description, self.asset_type, self.assetId],
                            {
                                outFormat: oracledb.Object
                            }).then(res => {
                                console.log('1st update done(Asset details updated)')
                            })
                    }
                    , function secondAction() {
                        if (oj.length > 0) {
                            //console.log("statement:", oj)
                            return connection.execute(`delete from ASSET_LINKS  WHERE ASSET_ID=:ASSET_ID`, [self.assetId]
                                , {
                                    autoCommit: true
                                }
                            ).then(res => {
                                //console.log('2nd update done(Asset links updated)' + res)
                                connection.executeMany(`INSERT into ASSET_LINKS(LINK_URL_TYPE,LINK_URL,LINK_REPOS_TYPE,LINK_DESCRIPTION,LINK_DESCRIPTION_DATA,DEPLOY_STATUS,LINK_ID,ASSET_ID) values(
                                    :LINK_URL_TYPE,:LINK_URL,:LINK_REPOS_TYPE,:LINK_DESCRIPTION,:LINK_DESCRIPTION_DATA,:DEPLOY_STATUS,:LINK_ID,:ASSET_ID)`,
                                    oj, {
                                    autoCommit: true
                                })
                            })
                        }
                        else {
                            return connection.query(`SELECT * from asset_links  where link_active='true'`, {})
                        }
                    }, function thirdAction() {
                        if (filterArr.length > 0) {
                            //console.log(filterArr)
                            return connection.execute(`delete from ASSET_FILTER_ASSET_MAP WHERE ASSET_ID=:ASSET_ID`, [self.assetId],
                                {
                                    autocommit: true
                                }
                            ).then(res => {
                                connection.batchInsert(`INSERT into ASSET_FILTER_ASSET_MAP values(
                            :FILTER_ASSET_MAP_ID,:FILTER_ID,:ASSET_ID)`, filterArr,
                                    {
                                        outFormat: oracledb.Object
                                    }).then(res => {
                                        console.log("filters inserted successfully")
                                    })
                            })
                        }
                        else {
                            return connection.query(`SELECT * from ASSET_FILTER_ASSET_MAP`, {})
                        }
                    }], {
                    sequence: true
                })
                    .then(function onTransactionResults(output) {
                        //console.log('Update transaction successful');
                        resolve("updated")
                    })
                    .catch(err => {
                        console.log(err)
                    })
            }
            else {
                this.assetId = uniqid.process('AH-');
                assetid = this.assetId;
                //console.log(this.assetId, self.links)
                if (!this.filters) {
                    this.filters = []
                }
                if (this.filters.length > 1) {
                    this.filters.forEach(f => {
                        filterObj.FILTER_ASSET_MAP_ID = uniqid.process();
                        filterObj.FILTER_ID = f.Value;
                        filterObj.ASSET_ID = assetid;
                        filterArr.push(filterObj)
                        filterObj = {};
                    })
                }
                else if (this.filters.length === 1) {
                    filterObj.FILTER_ASSET_MAP_ID = uniqid.process();
                    filterObj.FILTER_ID = this.filters[0].Value;
                    filterObj.ASSET_ID = assetid;
                    filterArr.push(filterObj)
                }
                else {
                    filterArr = null;
                }
                let oj = this.links;

                //console.log("MODEL LINK1", oj)
                if (!(oj === null)) {
                    oj.forEach(link => {
                        // linkObj={LINK_ID:uniqid.process(),ASSET_ID:assetid,...link}
                        // return linkObj
                        link.LINK_ID = uniqid.process();
                        link.ASSET_ID = assetid;
                    })
                }

                //console.log("FilterArr", filterArr)
                //console.log("MODEL LINK2", oj)

                connection.transaction([
                    function firstAction() {
                        return connection.insert(`INSERT into ASSET_DETAILS(ASSET_ID,ASSET_TITLE,ASSET_DESCRIPTION,
                ASSET_USERCASE,ASSET_CUSTOMER,ASSET_CREATEDBY,ASSET_CREATED_DATE,ASSET_SCRM_ID,ASSET_OPP_ID,
                ASSET_THUMBNAIL,ASSET_MODIFIED_DATE,ASSET_MODIFIED_BY,ASSET_VIDEO_URL,ASSET_EXPIRY_DATE,ASSET_VIDEO_LINK,ASSET_LOCATION,ASSET_OWNER,ASSET_STATUS,ASSET_ARCHITECTURE_DESCRIPTION,ASSET_TYPE) values(:ASSET_ID,:ASSET_TITLE,:ASSET_DESCRIPTION,
                :ASSET_USERCASE,:ASSET_CUSTOMER,:ASSET_CREATEDBY,:CREATED_DATE,:ASSET_SCRM_ID,:ASSET_OPP_ID,
                :ASSET_THUMBNAIL,:ASSET_MODIFIED_DATE,:ASSET_MODIFIED_BY,:ASSET_VIDEO_URL,:ASSET_EXPIRY_DATE,:ASSET_VIDEO_LINK,:ASSET_LOCATION,:ASSET_OWNER,:ASSET_STATUS,:ASSET_ARCHITECTURE_DESCRIPTION,ASSET_TYPE)`,
                            [assetid, self.title, self.description, self.usercase, self.customer, self.createdBy.toLowerCase(),
                                self.createdDate, self.scrmId, self.oppId, self.thumbnail, self.modifiedDate, self.modifiedBy, self.ASSET_VIDEO_URL, self.expiryDate, self.video_link, self.location, self.owner.toLowerCase(), 'Pending Review', self.asset_architecture_description, self.asset_type],
                            {
                                outFormat: oracledb.Object
                            }).then(res => {
                                console.log('1st insert done(Asset details inserted)')
                            })
                    }
                    , function secondAction() {
                        if (oj.length > 0) {
                            return connection.batchInsert(`INSERT into ASSET_LINKS(LINK_URL_TYPE,LINK_URL,LINK_REPOS_TYPE,LINK_DESCRIPTION,LINK_DESCRIPTION_DATA,DEPLOY_STATUS,LINK_ID,ASSET_ID) values(
                :LINK_URL_TYPE,:LINK_URL,:LINK_REPOS_TYPE,:LINK_DESCRIPTION,:LINK_DESCRIPTION_DATA,:DEPLOY_STATUS,:LINK_ID,:ASSET_ID)`,
                                oj, {
                                autocommit: true
                            }
                            )
                        }
                        else {
                            //console.log("oj is empty")
                            return connection.query(`SELECT * from asset_links  where link_active='true'`, {})
                        }
                    }, function thirdAction() {
                        if (filterArr.length > 0) {
                            return connection.batchInsert(`INSERT into ASSET_FILTER_ASSET_MAP values(
                    :FILTER_ASSET_MAP_ID,:FILTER_ID,:ASSET_ID)`, filterArr,
                                {
                                    outFormat: oracledb.Object
                                }).then(res => {
                                    console.log("filters inserted successfully")
                                })
                        }
                        else {
                            return connection.query(`SELECT * from ASSET_FILTER_ASSET_MAP`, {})
                        }
                    }
                ], {
                    sequence: true
                })
                    .then(function onTransactionResults(output) {
                        //console.log('transaction successful');
                        resolve({ Asset_ID: assetid })
                    })
                    .catch(err => {
                        console.log(err)
                    })

            }
        })
    }

    saveTest() {

        return new Promise((resolve, reject) => {
            var assetid = this.assetId;
            var self = this;
            const connection = getDb();
            let filterObj = {};
            let filterArr = [];
            //console.log("------------------ SAVEING ASSET -----------------");
            //console.log(JSON.stringify(self));

            if (this.assetId) {

                //   //console.log("in edit mode")
                // //console.log(this.links)
                if (!this.filters) {
                    this.filters = []
                }
                if (this.filters.length > 1) {
                    this.filters.forEach(f => {
                        filterObj.FILTER_ASSET_MAP_ID = uniqid.process();
                        filterObj.FILTER_ID = f.Value;
                        filterObj.ASSET_ID = assetid;
                        filterArr.push(filterObj)
                        filterObj = {};
                    })
                }
                else if (this.filters.length === 1) {
                    filterObj.FILTER_ASSET_MAP_ID = uniqid.process();
                    filterObj.FILTER_ID = this.filters[0].Value;
                    filterObj.ASSET_ID = assetid;
                    filterArr.push(filterObj)
                }
                else {
                    filterArr = null;
                }
                const oj = this.links;
                if (!(oj === null)) {
                    oj.forEach(link => {
                        // linkObj={LINK_ID:uniqid.process(),ASSET_ID:assetid,...link}
                        // return linkObj
                        link.LINK_ID = uniqid.process();
                        link.ASSET_ID = self.assetId;
                    })
                }

                connection.transaction([
                    function firstAction() {
                        return connection.update(`UPDATE ASSET_DETAILS set 
            ASSET_TITLE=:ASSET_TITLE,
            ASSET_DESCRIPTION=:ASSET_DESCRIPTION,
            ASSET_USERCASE=:ASSET_USERCASE,
            ASSET_CUSTOMER=:ASSET_CUSTOMER,
            ASSET_CREATEDBY=:ASSET_CREATEDBY,
            ASSET_SCRM_ID=:ASSET_SCRM_ID,
            ASSET_OPP_ID=:ASSET_OPP_ID,
            ASSET_MODIFIED_DATE=:ASSET_MODIFIED_DATE,
            ASSET_MODIFIED_BY=:ASSET_MODIFIED_BY,
            ASSET_EXPIRY_DATE=:ASSET_EXPIRY_DATE,
	    ASSET_VIDEO_LINK=:ASSET_VIDEO_LINK,
        ASSET_LOCATION=:ASSET_LOCATION,
        ASSET_OWNER=:ASSET_OWNER,
        ASSET_STATUS=:ASSET_STATUS,
        ASSET_ARCHITECTURE_DESCRIPTION=:ASSET_ARCHITECTURE_DESCRIPTION,
        ASSET_TYPE=:ASSET_TYPE
             WHERE ASSET_ID=:ASSET_ID`,
                            [self.title, self.description, self.usercase, self.customer, self.createdBy.toLowerCase(),
                            self.scrmId, self.oppId, new Date(), self.modifiedBy, self.expiryDate, self.video_link, self.location, self.owner.toLowerCase(), 'Pending Review', self.asset_architecture_description, self.asset_type, self.assetId],
                            {
                                outFormat: oracledb.Object
                            }).then(res => {
                                console.log('1st update done(Asset details updated)')
                            })
                    }
                    , function secondAction() {
                        if (oj.length > 0) {
                            //console.log("statement:", oj)
                            return connection.execute(`delete from ASSET_LINKS  WHERE ASSET_ID=:ASSET_ID`, [self.assetId]
                                , {
                                    autoCommit: true
                                }
                            ).then(res => {
                                //console.log('2nd update done(Asset links updated)' + res)
                                connection.batchInsert(`INSERT into ASSET_LINKS(LINK_URL_TYPE,LINK_URL,LINK_REPOS_TYPE,LINK_DESCRIPTION,LINK_DESCRIPTION_DATA,DEPLOY_STATUS,LINK_ID,ASSET_ID) values(
                                    :LINK_URL_TYPE,:LINK_URL,:LINK_REPOS_TYPE,:LINK_DESCRIPTION,:LINK_DESCRIPTION_DATA,:DEPLOY_STATUS,:LINK_ID,:ASSET_ID)`,
                                    oj, {
                                    autoCommit: true
                                })
                            })
                        }
                        else {
                            return connection.query(`SELECT * from asset_links  where link_active='true'`, {})
                        }
                    }, function thirdAction() {
                        if (filterArr.length > 0) {
                            //console.log(filterArr)
                            return connection.execute(`delete from ASSET_FILTER_ASSET_MAP WHERE ASSET_ID=:ASSET_ID`, [self.assetId],
                                {
                                    autocommit: true
                                }
                            ).then(res => {
                                connection.batchInsert(`INSERT into ASSET_FILTER_ASSET_MAP values(
                            :FILTER_ASSET_MAP_ID,:FILTER_ID,:ASSET_ID)`, filterArr,
                                    {
                                        outFormat: oracledb.Object
                                    }).then(res => {
                                        console.log("filters inserted successfully")
                                    })
                            })
                        }
                        else {
                            return connection.query(`SELECT * from ASSET_FILTER_ASSET_MAP`, {})
                        }
                    }], {
                    sequence: true
                })
                    .then(function onTransactionResults(output) {
                        //console.log('Update transaction successful');
                        resolve("updated")
                    })
                    .catch(err => {
                        console.log(err)
                    })
            }
            else {
                this.assetId = uniqid.process('AH-');
                assetid = this.assetId;
                //console.log(this.assetId, self.links)
                if (!this.filters) {
                    this.filters = []
                }
                if (this.filters.length > 1) {
                    this.filters.forEach(f => {
                        filterObj.FILTER_ASSET_MAP_ID = uniqid.process();
                        filterObj.FILTER_ID = f.Value;
                        filterObj.ASSET_ID = assetid;
                        filterArr.push(filterObj)
                        filterObj = {};
                    })
                }
                else if (this.filters.length === 1) {
                    filterObj.FILTER_ASSET_MAP_ID = uniqid.process();
                    filterObj.FILTER_ID = this.filters[0].Value;
                    filterObj.ASSET_ID = assetid;
                    filterArr.push(filterObj)
                }
                else {
                    filterArr = null;
                }
                let oj = this.links;

                //console.log("MODEL LINK1", oj)
                if (!(oj === null)) {
                    oj.forEach(link => {
                        // linkObj={LINK_ID:uniqid.process(),ASSET_ID:assetid,...link}
                        // return linkObj
                        link.LINK_ID = uniqid.process();
                        link.ASSET_ID = assetid;
                    })
                }

                //console.log("FilterArr", filterArr)
                //console.log("MODEL LINK2", oj)

                connection.transaction([
                    function firstAction() {
                        return connection.insert(`INSERT into ASSET_DETAILS(ASSET_ID,ASSET_TITLE,ASSET_DESCRIPTION,
                ASSET_USERCASE,ASSET_CUSTOMER,ASSET_CREATEDBY,ASSET_CREATED_DATE,ASSET_SCRM_ID,ASSET_OPP_ID,
                ASSET_THUMBNAIL,ASSET_MODIFIED_DATE,ASSET_MODIFIED_BY,ASSET_VIDEO_URL,ASSET_EXPIRY_DATE,ASSET_VIDEO_LINK,ASSET_LOCATION,ASSET_OWNER,ASSET_STATUS,ASSET_ARCHITECTURE_DESCRIPTION,ASSET_TYPE) values(:ASSET_ID,:ASSET_TITLE,:ASSET_DESCRIPTION,
                :ASSET_USERCASE,:ASSET_CUSTOMER,:ASSET_CREATEDBY,:CREATED_DATE,:ASSET_SCRM_ID,:ASSET_OPP_ID,
                :ASSET_THUMBNAIL,:ASSET_MODIFIED_DATE,:ASSET_MODIFIED_BY,:ASSET_VIDEO_URL,:ASSET_EXPIRY_DATE,:ASSET_VIDEO_LINK,:ASSET_LOCATION,:ASSET_OWNER,:ASSET_STATUS,:ASSET_ARCHITECTURE_DESCRIPTION,:ASSET_TYPE)`,
                            [assetid, self.title, self.description, self.usercase, self.customer, self.createdBy.toLowerCase(),
                                self.createdDate, self.scrmId, self.oppId, self.thumbnail, self.modifiedDate, self.modifiedBy, self.ASSET_VIDEO_URL, self.expiryDate, self.video_link, self.location, self.owner.toLowerCase(), 'Pending Review', self.asset_architecture_description, self.asset_type],
                            {
                                outFormat: oracledb.Object
                            }).then(res => {
                                console.log('1st insert done(Asset details inserted)')
                            })
                    }
                    , function secondAction() {
                        if (oj.length > 0) {
                            return connection.batchInsert(`INSERT into ASSET_LINKS(LINK_URL_TYPE,LINK_URL,LINK_REPOS_TYPE,LINK_DESCRIPTION,LINK_DESCRIPTION_DATA,DEPLOY_STATUS,LINK_ID,ASSET_ID) values(
                :LINK_URL_TYPE,:LINK_URL,:LINK_REPOS_TYPE,:LINK_DESCRIPTION,:LINK_DESCRIPTION_DATA,:DEPLOY_STATUS,:LINK_ID,:ASSET_ID)`,
                                oj, {
                                autocommit: true
                            }
                            )
                        }
                        else {
                            //console.log("oj is empty")
                            return connection.query(`SELECT * from asset_links  where link_active='true'`, {})
                        }
                    }, function thirdAction() {
                        if (filterArr.length > 0) {
                            return connection.batchInsert(`INSERT into ASSET_FILTER_ASSET_MAP values(
                    :FILTER_ASSET_MAP_ID,:FILTER_ID,:ASSET_ID)`, filterArr,
                                {
                                    outFormat: oracledb.Object
                                }).then(res => {
                                    console.log("filters inserted successfully")
                                })
                        }
                        else {
                            return connection.query(`SELECT * from ASSET_FILTER_ASSET_MAP`, {})
                        }
                    }
                ], {
                    sequence: true
                })
                    .then(function onTransactionResults(output) {
                        //console.log('transaction successful');
                        resolve({ Asset_ID: assetid })
                    })
                    .catch(err => {
                        console.log(err)
                    })

            }
        })
    }


    static uploadImages(host, assetId, images, imageDescription) {
        return new Promise((resolve, reject) => {
            let filesArray = [];
            const connection = getDb();
            //console.log(assetId+"/n",images)
            if (images.length > 1) {
                //console.log("multiple images")
                images.forEach(sampleFile => {
                    filesArray = generateFileName(sampleFile, assetId, filesArray, imageDescription);
                })
            }
            else {
                //console.log("single image")
                const sampleFile = images;
                filesArray = generateFileName(sampleFile, assetId, filesArray, imageDescription);
            }
            //console.log(filesArray)
            connection.batchInsert(`INSERT INTO ASSET_IMAGES values(:IMAGE_ID,:ASSET_ID,:IMAGE_NAME,:IMAGEURL,:IMAGE_DESCRIPTION)`,
                filesArray,
                {
                    autoCommit: true,
                }
            ).then(res => {
                resolve('done')
            }).catch(err => {
                //console.log(err)
                reject(err)
            })
        })
    }



    static uploadThumbnail(host, assetId, thumbnail) {
        return new Promise((resolve, reject) => {
            //console.log("inside thumnnail function")
            const connection = getDb();
            let fname = thumbnail.name.split('.')[0];
            fname = fname.replace(/ /g, '');

            const ftype = thumbnail.name.split('.')[1];
            const uniqueId = uniqid();
            const finalFname = fname + uniqueId.concat('.', ftype);
            //console.log(finalFname)
            const uploadPath = path.join(__dirname, '../../../..', 'mnt/ahfs/', finalFname);
            var content = `${finalFname}`
            //console.log(content)
            thumbnail.mv(uploadPath, function (err) {
                if (err) {
                    return res.status(500).send(err);
                }
            })
            connection.update(`UPDATE ASSET_DETAILS set 
            ASSET_THUMBNAIL=:ASSET_THUMBNAIL
             WHERE ASSET_ID=:ASSET_ID`, [content, assetId],
                {
                    autoCommit: true
                }
            ).then(res => {
                //console.log("thumbnail inserted Successfully")
                //console.log(res)
                resolve("working")
            })
        })
    }

    static uploadVideo(host, assetId, video) {
        return new Promise((resolve, reject) => {
            //console.log("inside video function")
            const connection = getDb();
            let fname = video.name.split('.')[0];
            fname = fname.replace(/ /g, '');

            const ftype = video.name.split('.')[1];
            const uniqueId = uniqid();
            const finalFname = fname + uniqueId.concat('.', ftype);
            const uploadPath = path.join(__dirname, '../../../..', 'mnt/ahfs/', finalFname);
            var content = `${finalFname}`
            video.mv(uploadPath, function (err) {
                if (err) {
                    return res.status(500).send(err);
                }
            })
            connection.update(`UPDATE ASSET_DETAILS set 
        ASSET_VIDEO_URL=:ASSET_VIDEO_URL
             WHERE ASSET_ID=:ASSET_ID`, [content, assetId],
                {
                    outFormat: oracledb.Object,
                    autoCommit: true
                }).then(res => {
                    //console.log("video inserted Successfully")
                    resolve("working")
                })
        })
    }


    static uploadCommentByAssetId(reqdata, assetid, comment, commentBy, commentId, commentByUserName) {
        let action;
        let sql;
        let options;
        //console.log('uploadCommentByAssetId');
        return new Promise((resolve, reject) => {
            if (!commentId) {
                action = "inserted"
                sql = `INSERT into ASSET_COMMENTS values(:COMMENT_ID,:COMMENT_COMMENT,:COMMENTBY,:COMMENTON,:ASSET_ID,:COMMENT_USERNAME)`;
                options = [uniqid(), comment, commentBy, new Date(), assetid, commentByUserName]
            }
            else {
                //console.log("in comment update section")
                action = "updated"
                sql = `UPDATE ASSET_COMMENTS 
                SET COMMENT_COMMENT=:COMMENT_COMMENT
                 WHERE  COMMENT_ID=:COMMENT_ID`;
                options = [comment, commentId]
            }
            const connection = getDb();
            connection.execute(sql, options,
                {
                    outFormat: oracledb.Object,
                    autoCommit: true
                })
                .then(res => {
                    emailnotification.triggerEmailNotificationforFeedback(reqdata);
                    resolve({ status: "comment " + action + " successfully" });
                })
                .catch(err => {
                    console.log(err)
                })
        })
    }


    static uploadLikeByAssetId(assetid, likeBy, likeId, likeByUserName) {
        let action;
        let sql;
        let options;

        return new Promise((resolve, reject) => {
            if (!likeId) {
                action = "inserted"
                sql = `INSERT into ASSET_LIKES values(:LIKE_ID,:ASSET_ID,:LIKE_BY,:LIKE_CREATED,:LIKE_USERNAME)`;
                options = [uniqid(), assetid, likeBy, new Date(), likeByUserName]
            }
            else {
                //console.log("in like unlike section")
                action = "unliked"
                sql = `DELETE from ASSET_LIKES WHERE  LIKE_ID=:LIKE_ID`;
                options = [likeId]
            }

            const connection = getDb();
            connection.execute(sql, options,
                {
                    outFormat: oracledb.Object,
                    autoCommit: true
                })
                .then(res => {
                    resolve({ status: "like " + action + " successfully" })
                })
                .catch(err => {
                    //console.log(err)
                })
        })
    }

    static uploadLikeByAssetId2(assetid, likeBy, like_by_username, action) {

        let sql;
        let options;
        let likeIdGenerated = uniqid();
        return new Promise((resolve, reject) => {
            if (action === "insert") {
                //console.log("like insert section")
                sql = `INSERT into ASSET_LIKES values(:LIKE_ID,:ASSET_ID,:LIKE_BY,:LIKE_CREATED,:LIKE_USERNAME)`;
                options = [likeIdGenerated, assetid, likeBy, new Date(), like_by_username]
            }
            else {
                //console.log("in like unlike section")
                sql = `DELETE from ASSET_LIKES WHERE  LIKE_BY=:LIKE_BY and ASSET_ID=:ASSET_ID`;
                options = [likeBy, assetid]
            }

            const connection = getDb();
            connection.execute(sql, options,
                {
                    outFormat: oracledb.Object,
                    autoCommit: true
                })
                .then(res => {
                    if (action === 'insert') {
                        resolve({ "like_id": likeIdGenerated })
                    }
                    else {
                        resolve({ "status": "like " + action + " successfully" })
                    }
                })
                .catch(err => {
                    console.log(err)
                })
        })

    }


    static addViewByAssetId(assetId, viewedBy, viewed_by_username, viewed_on) {
        //console.log(assetId + " - " + viewedBy + " - " + viewed_by_username + " - " + viewed_on)
        return new Promise((resolve, reject) => {
            let sql = `INSERT into ASSET_VIEWS(VIEW_ID,
                ASSET_ID,
                VIEWED_BY,
                VIEW_CREATED_ON,
                VIEWED_BY_USERNAME,
                CLIENT_PLATFORM)  values(:0,:1,:2,:3,:4,:5)`;
            let options = [uniqid(), assetId, viewedBy, new Date(), viewed_by_username, viewed_on]
            const connection = getDb();
            connection.execute(sql, options,
                {
                    outFormat: oracledb.Object,
                    autoCommit: true
                })
                .then(res => {
                    resolve({ "status": "view added" })
                })
                .catch(err => {
                    //console.log("View error: " + err);
                    resolve(err)
                })

        })
    }

    static deleteUploadedImageById(imageId) {
        return new Promise((resolve, reject) => {
            const connection = getDb();
            connection.execute(`DELETE from ASSET_IMAGES WHERE IMAGE_ID=:IMAGE_ID`, [imageId],
                {
                    autoCommit: true,
                    outFormat: oracledb.Object
                })
                .then(res => {
                    //console.log(res)
                    resolve({ msg: 'Image Deleted Successfully' })
                })
        })

    }

    static deleteAllUploadedImages(assetId) {
        return new Promise((resolve, reject) => {
            const connection = getDb();
            connection.execute(`DELETE from ASSET_IMAGES WHERE ASSET_ID=:ASSET_ID`, [assetId],
                {
                    autoCommit: true,
                    outFormat: oracledb.Object
                })
                .then(res => {
                    resolve('Images Deleted Successfully')
                })
        })
    }

    //delete single link for an asset
    static deleteUploadedLinkById(assetId, linkId) {
        return new Promise((resolve, reject) => {
            const connection = getDb();
            connection.execute(`DELETE from ASSET_LINKS WHERE LINK_ID=:LINK_ID and ASSET_ID=:ASSET_ID`, [linkId, assetId],
                {
                    autoCommit: true,
                    outFormat: oracledb.Object
                })
                .then(res => {
                    resolve('Link Deleted Successfully')
                })
        })

    }

    static deleteAssetById(assetId) {
        return new Promise((resolve, reject) => {
            const connection = getDb();
            connection.execute(`DELETE from ASSET_DETAILS WHERE ASSET_ID=:ASSET_ID`, [assetId],
                {
                    autoCommit: true,
                    outFormat: oracledb.Object
                })
                .then(res => {
                    connection.execute(`DELETE from ASSET_IMAGES WHERE ASSET_ID=:ASSET_ID`, [assetId],
                        {
                            autoCommit: true,
                            outFormat: oracledb.Object
                        })
                        .then(res => {
                            connection.execute(`DELETE from ASSET_LINKS WHERE ASSET_ID=:ASSET_ID`, [assetId],
                                {
                                    autoCommit: true,
                                    outFormat: oracledb.Object
                                })
                                .then(res => {
                                    resolve("Asset deleted successfully")
                                })
                        })
                })
        })
    }





    //delete all links for an asset at one go
    static deleteAllUploadedLinks(assetId) {
        return new Promise((resolve, reject) => {
            const connection = getDb();
            connection.execute(`DELETE from ASSET_LINKS WHERE ASSET_ID=:ASSET_ID`, [assetId],
                {
                    autoCommit: true,
                    outFormat: oracledb.Object
                })
                .then(res => {
                    resolve('Links Deleted Successfully')
                })
        })
    }


    static filterAssetBySearchString(data, filterdata, searchString, filtersasset) {
        searchString = searchString.trim().toLowerCase();
        let assetFilters = [];
        return new Promise((resolve) => {
            for (let i = 0; i < data.length; i++) {

                console.log(data[i].ASSET_THUMBNAIL);
                let combineContentToMatch = data[i].ASSET_TITLE +
                    data[i].ASSET_DESCRIPTION +
                    data[i].ASSET_USERCASE +
                    data[i].ASSET_CUSTOMER +
                    data[i].ASSET_ARCHITECTURE_DESCRIPTION

                assetFilters = filterdata
                    .filter(filter => data[i].ASSET_ID === filter.ASSET_ID)
                    .map((filter) => {
                        combineContentToMatch += filter.FILTER_NAME + filter.FILTER_TYPE;
                    });

                let wordlist = searchString.split(" ");

                combineContentToMatch = combineContentToMatch.toLowerCase();
                wordlist.forEach(word => {
                    if (combineContentToMatch.indexOf(word) != -1) {// MATCH FOUND
                        filtersasset.push(data[i]);
                    }
                })
            }
            resolve(true);
        })
    }


    static fetchAssets2(host, offset, limit, filters, searchString, sortBy, order, action) {
        console.log("===================================");
        console.log("HOST: "+host);
        console.log("===================================")
        return new Promise((resolve, reject) => {
            if (filters.length > 0 && filters != "") {
                let filterString = "'" + filters.toString().replace(/,/g, "','") + "'";
                const connection = getDb();
                let fetchfilterDetailssql = `select filter_name,filter_type,filter_id from asset_filter where filter_id in(` + filterString + `)`;
                let fetchfilterDetailsOption = {};

                connection.query(fetchfilterDetailssql, fetchfilterDetailsOption,
                    {
                        outFormat: oracledb.OBJECT
                    }).then(data => {
                        this.convertsql(data).then(query => {
                            const connection = getDb();
                            connection.query(query, {},
                                {
                                    outFormat: oracledb.OBJECT
                                }).then(data => {
                                    // WE ARE THE GETTING THE FILTERED ASSETS BASED ON SELECTION
                                    let fetchAllFilterSQL = `select a.filter_id,a.filter_name,a.filter_type,b.asset_id from asset_filter a, asset_filter_asset_map b where a.filter_id=b.filter_id and a.filter_status=1`;

                                    connection.query(fetchAllFilterSQL, {},
                                        {
                                            outFormat: oracledb.OBJECT
                                        }).then(filterdata => {
                                            let filtersasset = [];
                                            this.filterAssetBySearchString(data, filterdata, searchString, filtersasset).then(res => {
                                                console.log("Content filter ended : " + filtersasset.length);
                                                this.refineAssets(host, offset, limit, filtersasset, sortBy, order, action).then(assets => {
                                                    resolve(assets);
                                                })
                                            })
                                        })
                                })

                        })
                    }).catch(err => {
                        console.log("error > " + JSON.stringify(err));
                    })
            } else {
                const connection = getDb();
                let query = "SELECT * FROM ASSET_DETAILS WHERE asset_status='Live'";
                connection.query(query, {},
                    {
                        outFormat: oracledb.OBJECT
                    }).then(data => {
                        // WE ARE THE GETTING THE FILTERED ASSETS BASED ON SELECTION
                        let fetchAllFilterSQL = `select a.filter_id,a.filter_name,a.filter_type,b.asset_id from asset_filter a, asset_filter_asset_map b where a.filter_id=b.filter_id and a.filter_status=1`;

                        connection.query(fetchAllFilterSQL, {},
                            {
                                outFormat: oracledb.OBJECT
                            }).then(filterdata => {
                                let filtersasset = [];
                                this.filterAssetBySearchString(data, filterdata, searchString, filtersasset).then(res => {
                                    console.log("Content filter ended : " + filtersasset.length);
                                    this.refineAssets(host, offset, limit, filtersasset, sortBy, order, action).then(assets => {
                                        resolve(assets);
                                    })
                                })
                            })

                    })
            }
        });
    }

    static refineAssets(host, offset, limit, assetsArray, sortBy, order, action) {

        console.log(assetsArray.length);
        let assetidtracker={};
        let uniqueassetarray=assetsArray.filter(asset=>{
            console.log(JSON.stringify(asset));
            if(!assetidtracker[asset.ASSET_ID]){
                assetidtracker[asset.ASSET_ID]=1;
                return asset;
            }
        })
        assetsArray=uniqueassetarray;
        console.log(assetsArray.length);

        let allAssetsObj = {};
        let tAssets = [];
        let allAssets = [];
        let linksArray = [];
        let commentsArray = [];
        let ratingsArray = [];
        let imagesArray = [];
        let linkType = [];
        var lobj2 = {};
        let lobj = {};
        let linkObjArr = [];
        let sql;
        var options = {};
        let likesArray = [];
        let viewsArray = [];
        let solutionAreasArray = [];
        let solutionAreas = [];
        let assetTypes = [];
        let assetTypesArray = [];
        let salesPlays = [];
        let salesPlaysArray = [];
        let industry = [];
        let industryArray = [];
        let promotedArray = [];
        return new Promise((resolve, reject) => {
            assetsArray.forEach(asset => {
                
                // console.log("---------------- THUMBNAIL -------------------------")
                // console.log(asset.ASSET_THUMBNAIL);
                asset.ASSET_THUMBNAIL = 'http://' + host + '/' + asset.ASSET_THUMBNAIL;
                console.log(asset.ASSET_ID);
                // console.log("---------------- THUMBNAIL -------------------------")
                asset.createdDate = asset.ASSET_CREATED_DATE;
            })
            const connection = getDb();
            connection.execute(`SELECT * from ASSET_LINKS  where link_active='true'`, {},
                {
                    outFormat: oracledb.OBJECT
                },
            ).then(res => {
                ////console.log("links Details : ",res)
                linksArray = res.rows;
                connection.query(`select Count(*) comment_count,asset_id from 
                asset_comments group by asset_id`, [],
                    {
                        outFormat: oracledb.OBJECT
                    })
                    .then(res => {
                        //console.log("comment count",res)
                        commentsArray = res;
                        connection.query(`select avg(rate) avg_rating,asset_id from asset_rates group by asset_id`, [],
                            {
                                outFormat: oracledb.OBJECT
                            }).then(res => {
                                ratingsArray = res;
                                //console.log(ratingsArray)
                                connection.execute(`SELECT * from ASSET_IMAGES`, {},
                                    {
                                        outFormat: oracledb.OBJECT
                                    })
                                    .then(res => {
                                        imagesArray = res.rows;
                                        connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Solution Area'`, {},
                                            {
                                                outFormat: oracledb.OBJECT
                                            })
                                            .then(res => {
                                                solutionAreasArray = res.rows;
                                                connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Asset Type'`, {},
                                                    {
                                                        outFormat: oracledb.OBJECT
                                                    })
                                                    .then(res => {
                                                        assetTypesArray = res.rows;
                                                        connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Sales Play'`, {},
                                                            {
                                                                outFormat: oracledb.OBJECT
                                                            })
                                                            .then(res => {
                                                                salesPlaysArray = res.rows;
                                                                connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Industry'`, {},
                                                                    {
                                                                        outFormat: oracledb.OBJECT
                                                                    })
                                                                    .then(res => {
                                                                        industryArray = res.rows;
                                                                        //console.log(solutionAreasArray)
                                                                        connection.execute(`SELECT asset_id from ASSET_LOB_LEADER_PROMOTED_ASSETS where status=1`, [],
                                                                            {
                                                                                outFormat: oracledb.OBJECT
                                                                            })
                                                                            .then(res => {
                                                                                promotedArray = res.rows;
                                                                                connection.execute(`SELECT count(*) like_count,asset_id from ASSET_LIKES group by asset_id`, [],
                                                                                    {
                                                                                        outFormat: oracledb.OBJECT
                                                                                    })
                                                                                    .then(res => {
                                                                                        //console.log("LIKES",res)
                                                                                        likesArray = res.rows;
                                                                                        connection.execute(`SELECT count(*) view_count,asset_id from ASSET_VIEWS group by asset_id`, [],
                                                                                            {
                                                                                                outFormat: oracledb.OBJECT
                                                                                            })
                                                                                            .then(res => {
                                                                                                viewsArray = res.rows;
                                                                                                assetsArray.forEach(asset => {
                                                                                                    const id = asset.ASSET_ID;
                                                                                                    allAssetsObj = asset
                                                                                                    allAssetsObj.LINKS = [];
                                                                                                    var links = linksArray.filter(link => link.ASSET_ID === id)
                                                                                                    ////console.log('links:',links)
                                                                                                    solutionAreas = solutionAreasArray.filter(s => s.ASSET_ID === id)
                                                                                                    assetTypes = assetTypesArray.filter(s => s.ASSET_ID === id)
                                                                                                    salesPlays = salesPlaysArray.filter(s => s.ASSET_ID === id)
                                                                                                    industry = industryArray.filter(s => s.ASSET_ID === id);
                                                                                                    let promote = promotedArray.filter(s => s.ASSET_ID === id);
                                                                                                    allAssetsObj.PROMOTE = promote.length == 0 ? false : true;
                                                                                                    allAssetsObj.SOLUTION_AREAS = solutionAreas;
                                                                                                    allAssetsObj.ASSET_TYPE = assetTypes;
                                                                                                    allAssetsObj.SALES_PLAY = salesPlays;
                                                                                                    allAssetsObj.INDUSTRY = industry;

                                                                                                    linkType = links.map(a => a.LINK_REPOS_TYPE)
                                                                                                    linkType = [...new Set(linkType)]
                                                                                                    ////console.log(linkType)
                                                                                                    linkType.forEach(type => {
                                                                                                        var links2 = linksArray.filter(link => link.LINK_REPOS_TYPE === type && link.ASSET_ID === id)
                                                                                                        lobj.TYPE = type;
                                                                                                        lobj.arr = links2;
                                                                                                        lobj2 = lobj
                                                                                                        linkObjArr.push(lobj2);
                                                                                                        lobj = {}
                                                                                                    })
                                                                                                    allAssetsObj.LINKS = linkObjArr;

                                                                                                    linkObjArr = [];
                                                                                                    ////console.log(lobj2,"obj2")
                                                                                                    var images = imagesArray.filter(image => image.ASSET_ID === id);
                                                                                                    images.forEach(image => {
                                                                                                        image.IMAGEURL = 'http://' + host + '/' + image.IMAGEURL;
                                                                                                    });
                                                                                                    allAssetsObj.IMAGES = images;
                                                                                                    var comments = commentsArray.filter(c => c.ASSET_ID === id);

                                                                                                    var ratings = ratingsArray.filter(r => r.ASSET_ID === id)
                                                                                                    var likes = likesArray.filter(l => l.ASSET_ID === id)
                                                                                                    var views = viewsArray.filter(v => v.ASSET_ID === id)
                                                                                                    //console.log(...views);
                                                                                                    if (comments[0]) {
                                                                                                        delete comments[0].ASSET_ID;

                                                                                                    }
                                                                                                    if (!comments.length) {
                                                                                                        comments.push({ COMMENT_COUNT: 0 });
                                                                                                    }
                                                                                                    if (!ratings.length) {
                                                                                                        ratings.push({ AVG_RATING: 0, ASSET_ID: id })
                                                                                                    }
                                                                                                    if (!likes.length) {
                                                                                                        likes.push({ LIKE_COUNT: 0, ASSET_ID: id })
                                                                                                    }
                                                                                                    if (!views.length) {
                                                                                                        views.push({ VIEW_COUNT: 0, ASSET_ID: id })
                                                                                                    }

                                                                                                    allAssetsObj.COMMENTS = comments[0];
                                                                                                    allAssetsObj.RATINGS = ratings[0];
                                                                                                    allAssetsObj.LIKES = likes[0];
                                                                                                    allAssetsObj.VIEWS = views[0];

                                                                                                    if (!(sortBy == 'views' && allAssetsObj.VIEWS.VIEW_COUNT == 0)) {
                                                                                                        allAssets.push(allAssetsObj)
                                                                                                    }
                                                                                                })

                                                                                                let allObj = {};
                                                                                                allObj.TOTALCOUNT = allAssets.length;
                                                                                                tAssets = allAssets.slice(offset, limit);
                                                                                                dynamicSort(tAssets, sortBy, order)
                                                                                                allObj.ASSETS = tAssets;
                                                                                                resolve(allObj);
                                                                                                //}

                                                                                            })
                                                                                    })
                                                                            })
                                                                    })
                                                            })
                                                    })
                                            })
                                    })
                            })

                    })
            })
        })
    }

    // CREATE QUERY STRING BASED ON SELECTED FILTERS
    static convertsql(data) {
        console.log("----------  Converting SQL ASSET -------------");

        let filterTypeMap = {};

        return new Promise((resolve, reject) => {
            // CREATE SQL queries   
            data.forEach(val => {
                let filterstring = filterTypeMap[val.FILTER_TYPE] != undefined ? filterTypeMap[val.FILTER_TYPE] + " and " : "select asset_id from asset_filter_asset_map where ";
                filterTypeMap[val.FILTER_TYPE] = filterstring + " filter_id='" + val.FILTER_ID + "'";
            });

            let queryString = "";

            Object.keys(filterTypeMap).forEach(filterType => {

                queryString = queryString.length > 0 ? queryString + " union " + filterTypeMap[filterType] : filterTypeMap[filterType];
            })

            queryString = "select b.* from  (" + queryString + ") a,asset_details b where a.asset_id=b.asset_id and b.asset_status='Live'";
            console.log(queryString);
            // RETURN THE GENERATED QUERY 
            resolve(queryString);
        })
    }


    //Fetch asset model function
    static fetchAssets(host, offset, limit, filters, searchString2, sortBy, order, action) {
        //console.log(action + "Host Modal Amit:- " + host);
        return new Promise((resolve, reject) => {
            let allAssetsObj = {};
            let tAssets = [];
            let allAssets = [];
            let assetsArray = [];
            let linksArray = [];
            let commentsArray = [];
            let ratingsArray = [];
            let imagesArray = [];
            let linkType = [];
            var lobj2 = {};
            let lobj = {};
            let linkObjArr = [];
            let sql;
            var options = {};
            let likesArray = [];
            let viewsArray = [];
            let solutionAreasArray = [];
            let solutionAreas = [];
            let assetTypes = [];
            let assetTypesArray = [];
            let salesPlays = [];
            let salesPlaysArray = [];
            let industry = [];
            let industryArray = [];
            let promotedArray = [];
            const connection = getDb();
            if (searchString2) {
                let searchString = searchString2.toLowerCase();
                sql = `select * from asset_details where asset_status='Live' and asset_id in(
                    select  d.asset_id from asset_details d join asset_filter_asset_map m on 
                    (d.asset_id=m.asset_id) where m.filter_id in (SELECT filter_id FROM ASSET_FILTER WHERE lower(FILTER_NAME) LIKE '%${searchString}%') UNION select asset_id from asset_details where (lower(ASSET_TITLE) LIKE '%${searchString}%' or lower(ASSET_DESCRIPTION) LIKE '%${searchString}%'))`;
                options = {
                }
                console.log(sql);
            } else if (filters[0]) {
                //console.log("filters", filters[0])

                var filterArr = [];
                filterArr = filters[0].split(',')
                //console.log(filterArr)
                var filter = filters.toString();

                const l = filterArr.length;
                if (action === 'preferenceApi') {
                    //console.log("PAPI HIT")
                    sql = `select * from asset_details where asset_status='Live' and asset_id in (
            select  distinct asset_id from asset_filter_asset_map 
            where filter_id in (select regexp_substr(:BIND,'[^,]+', 1, level)
            from dual 
            connect by regexp_substr(:BIND, '[^,]+', 1, level) is not null ))`;
                    options = {
                        BIND: filter

                    }

                }
                else {
                    sql = `select * from asset_details where asset_status='Live' and asset_id in(
                select  d.asset_id from asset_details d join asset_filter_asset_map m on 
                (d.asset_id=m.asset_id) where m.filter_id in (select regexp_substr(:BIND,'[^,]+', 1, level)
                from dual 
                connect by regexp_substr(:BIND, '[^,]+', 1, level) is not null ) 
                group by d.asset_id having count(distinct(m.filter_id))=:COUNT)`;
                    options = {
                        BIND: filter,
                        COUNT: l
                    }
                }
            }
            else {
                //console.log("no filters if")
                sql = `select * from asset_details where asset_status='Live'`;
                options = {

                }
            }


            connection.query(sql, options,
                {
                    outFormat: oracledb.OBJECT
                })
                .then(res => {
                    ////console.log("Asset Details : ",res)
                    assetsArray = res
                    assetsArray.forEach(asset => {
                        asset.ASSET_THUMBNAIL = 'http://' + host + '/' + asset.ASSET_THUMBNAIL;
                        asset.createdDate = asset.ASSET_CREATED_DATE;
                    })
                    //console.log("Assets: "+assetsArray)
                    connection.execute(`SELECT * from ASSET_LINKS  where link_active='true'`, {},
                        {
                            outFormat: oracledb.OBJECT
                        },
                    ).then(res => {
                        ////console.log("links Details : ",res)
                        linksArray = res.rows;
                        connection.query(`select Count(*) comment_count,asset_id from 
                asset_comments group by asset_id`, [],
                            {
                                outFormat: oracledb.OBJECT
                            })
                            .then(res => {
                                //console.log("comment count",res)
                                commentsArray = res;
                                connection.query(`select avg(rate) avg_rating,asset_id from asset_rates group by asset_id`, [],
                                    {
                                        outFormat: oracledb.OBJECT
                                    }).then(res => {
                                        ratingsArray = res;
                                        //console.log(ratingsArray)
                                        connection.execute(`SELECT * from ASSET_IMAGES`, {},
                                            {
                                                outFormat: oracledb.OBJECT
                                            })
                                            .then(res => {
                                                imagesArray = res.rows;
                                                connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Solution Area'`, {},
                                                    {
                                                        outFormat: oracledb.OBJECT
                                                    })
                                                    .then(res => {
                                                        solutionAreasArray = res.rows;
                                                        connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Asset Type'`, {},
                                                            {
                                                                outFormat: oracledb.OBJECT
                                                            })
                                                            .then(res => {
                                                                assetTypesArray = res.rows;
                                                                connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Sales Play'`, {},
                                                                    {
                                                                        outFormat: oracledb.OBJECT
                                                                    })
                                                                    .then(res => {
                                                                        salesPlaysArray = res.rows;
                                                                        connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Industry'`, {},
                                                                            {
                                                                                outFormat: oracledb.OBJECT
                                                                            })
                                                                            .then(res => {
                                                                                industryArray = res.rows;
                                                                                //console.log(solutionAreasArray)
                                                                                connection.execute(`SELECT asset_id from ASSET_LOB_LEADER_PROMOTED_ASSETS where status=1`, [],
                                                                                    {
                                                                                        outFormat: oracledb.OBJECT
                                                                                    })
                                                                                    .then(res => {
                                                                                        promotedArray = res.rows;
                                                                                        connection.execute(`SELECT count(*) like_count,asset_id from ASSET_LIKES group by asset_id`, [],
                                                                                            {
                                                                                                outFormat: oracledb.OBJECT
                                                                                            })
                                                                                            .then(res => {
                                                                                                //console.log("LIKES",res)
                                                                                                likesArray = res.rows;
                                                                                                connection.execute(`SELECT count(*) view_count,asset_id from ASSET_VIEWS group by asset_id`, [],
                                                                                                    {
                                                                                                        outFormat: oracledb.OBJECT
                                                                                                    })
                                                                                                    .then(res => {
                                                                                                        viewsArray = res.rows;
                                                                                                        assetsArray.forEach(asset => {
                                                                                                            const id = asset.ASSET_ID;
                                                                                                            allAssetsObj = asset
                                                                                                            allAssetsObj.LINKS = [];
                                                                                                            var links = linksArray.filter(link => link.ASSET_ID === id)
                                                                                                            ////console.log('links:',links)
                                                                                                            solutionAreas = solutionAreasArray.filter(s => s.ASSET_ID === id)
                                                                                                            assetTypes = assetTypesArray.filter(s => s.ASSET_ID === id)
                                                                                                            salesPlays = salesPlaysArray.filter(s => s.ASSET_ID === id)
                                                                                                            industry = industryArray.filter(s => s.ASSET_ID === id);
                                                                                                            let promote = promotedArray.filter(s => s.ASSET_ID === id);
                                                                                                            allAssetsObj.PROMOTE = promote.length == 0 ? false : true;
                                                                                                            allAssetsObj.SOLUTION_AREAS = solutionAreas;
                                                                                                            allAssetsObj.ASSET_TYPE = assetTypes;
                                                                                                            allAssetsObj.SALES_PLAY = salesPlays;
                                                                                                            allAssetsObj.INDUSTRY = industry;

                                                                                                            linkType = links.map(a => a.LINK_REPOS_TYPE)
                                                                                                            linkType = [...new Set(linkType)]
                                                                                                            ////console.log(linkType)
                                                                                                            linkType.forEach(type => {
                                                                                                                var links2 = linksArray.filter(link => link.LINK_REPOS_TYPE === type && link.ASSET_ID === id)
                                                                                                                lobj.TYPE = type;
                                                                                                                lobj.arr = links2;
                                                                                                                lobj2 = lobj
                                                                                                                linkObjArr.push(lobj2);
                                                                                                                lobj = {}
                                                                                                            })
                                                                                                            allAssetsObj.LINKS = linkObjArr;

                                                                                                            linkObjArr = [];
                                                                                                            ////console.log(lobj2,"obj2")
                                                                                                            var images = imagesArray.filter(image => image.ASSET_ID === id);
                                                                                                            images.forEach(image => {
                                                                                                                image.IMAGEURL = 'http://' + host + '/' + image.IMAGEURL;
                                                                                                            });
                                                                                                            allAssetsObj.IMAGES = images;
                                                                                                            var comments = commentsArray.filter(c => c.ASSET_ID === id);

                                                                                                            var ratings = ratingsArray.filter(r => r.ASSET_ID === id)
                                                                                                            var likes = likesArray.filter(l => l.ASSET_ID === id)
                                                                                                            var views = viewsArray.filter(v => v.ASSET_ID === id)
                                                                                                            //console.log(...views);
                                                                                                            if (comments[0]) {
                                                                                                                delete comments[0].ASSET_ID;

                                                                                                            }
                                                                                                            if (!comments.length) {
                                                                                                                comments.push({ COMMENT_COUNT: 0 });
                                                                                                            }
                                                                                                            if (!ratings.length) {
                                                                                                                ratings.push({ AVG_RATING: 0, ASSET_ID: id })
                                                                                                            }
                                                                                                            if (!likes.length) {
                                                                                                                likes.push({ LIKE_COUNT: 0, ASSET_ID: id })
                                                                                                            }
                                                                                                            if (!views.length) {
                                                                                                                views.push({ VIEW_COUNT: 0, ASSET_ID: id })
                                                                                                            }

                                                                                                            allAssetsObj.COMMENTS = comments[0];
                                                                                                            allAssetsObj.RATINGS = ratings[0];
                                                                                                            allAssetsObj.LIKES = likes[0];
                                                                                                            allAssetsObj.VIEWS = views[0];

                                                                                                            if (!(sortBy == 'views' && allAssetsObj.VIEWS.VIEW_COUNT == 0)) {
                                                                                                                allAssets.push(allAssetsObj)
                                                                                                            }
                                                                                                        })

                                                                                                        let allObj = {};
                                                                                                        allObj.TOTALCOUNT = allAssets.length;
                                                                                                        tAssets = allAssets.slice(offset, limit);
                                                                                                        dynamicSort(tAssets, sortBy, order)
                                                                                                        allObj.ASSETS = tAssets;
                                                                                                        resolve(allObj);
                                                                                                        //}

                                                                                                    })
                                                                                            })
                                                                                    })
                                                                            })
                                                                    })
                                                            })
                                                    })
                                            })
                                    })

                            })
                    })
                })
        })
    }


    static fetchAssetsById(assetId, host) {
        let assetObj = {}
        let linkObjArr = [];
        let lobj = {};
        let lobj2 = {};
        let filterType = [];
        let filterArr = [];
        let filterObj = {};
        let filterTypeArr = [];
        let filterArrFinal = [];
        let solutionAreas = [];
        let assetTypes = [];
        let salesPlays = [];
        let ratingAvg = [];
        let promote;
        let Industry = []
        return new Promise((resolve, reject) => {
            getAssetsById(assetId)
                .then(res => {
                    // //console.log(res)
                    assetObj = res[0];
                    if (!res.length > 0) {
                        resolve("No such asset")
                    }
                    else {
                        //resolve(res[0])
                        getLinksById(assetId)
                            .then(res => {
                                //console.log(res)
                                let linkType = [];
                                linkType = res.map(a => a.LINK_REPOS_TYPE)
                                linkType = [...new Set(linkType)]
                                ////console.log(linkType)
                                linkType.forEach(type => {
                                    var links2 = res.filter(link => link.LINK_REPOS_TYPE === type)
                                    lobj.TYPE = type;
                                    lobj.arr = links2;
                                    lobj2 = lobj
                                    linkObjArr.push(lobj2);
                                    lobj = {}
                                })
                                assetObj.LINKS = linkObjArr;
                                assetObj.ASSET_THUMBNAIL = 'http://' + host + '/' + assetObj.ASSET_THUMBNAIL;
                                getImagesById(assetId)
                                    .then(res => {
                                        //  //console.log(res)
                                        assetObj.IMAGES = res;
                                        assetObj.IMAGES.forEach(image => {
                                            image.IMAGEURL = 'http://' + host + '/' + image.IMAGEURL;
                                        });

                                        getCommentsById(assetId, host)
                                            .then(res => {
                                                assetObj.COMMENTS = res;
                                                getRatingsById(assetId)
                                                    .then(res => {
                                                        ratingAvg = res;
                                                        getSolutionAreasByAssetId(assetId)
                                                            .then(res => {
                                                                solutionAreas = res
                                                                getAssetTypesByAssetId(assetId)
                                                                    .then(res => {
                                                                        assetTypes = res
                                                                        getIndustryByAssetId(assetId)
                                                                            .then(res => {
                                                                                assetObj.INDUSTRY = res;
                                                                                getPromoteById(assetId)
                                                                                    .then(res => {
                                                                                        console.log(res);
                                                                                        assetObj.PROMOTE = res.length == 0 ? false : true;
                                                                                        getSalesPlayByAssetId(assetId)
                                                                                            .then(res => {
                                                                                                salesPlays = res.rows
                                                                                                assetObj.SOLUTION_AREAS = solutionAreas
                                                                                                assetObj.ASSET_TYPE = assetTypes
                                                                                                assetObj.SALES_PLAY = salesPlays
                                                                                                var avgArr = ratingAvg.map(r => r.RATE);
                                                                                                assetObj.AVG_RATING = avgArr.reduce((a, b) => a + b, 0) / avgArr.length;
                                                                                                getAssetFilterMapByIdandType(assetId).then(res => {
                                                                                                    filterArr = [...res]
                                                                                                    filterType = filterArr.map(a => a.FILTER_TYPE)
                                                                                                    filterType = [...new Set(filterType)]
                                                                                                    //console.log(filterType)
                                                                                                    filterType.forEach(type => {
                                                                                                        filterTypeArr = filterArr.filter(f => f.FILTER_TYPE === type)
                                                                                                        filterObj.TYPE = type;
                                                                                                        filterObj.arr = filterTypeArr;
                                                                                                        filterArrFinal.push(filterObj)
                                                                                                        filterObj = {};
                                                                                                    })
                                                                                                    //console.log(filterObj)
                                                                                                    assetObj.FILTERMAP = filterArrFinal
                                                                                                    resolve(assetObj)

                                                                                                })
                                                                                            })
                                                                                    })
                                                                            })
                                                                    })
                                                            })
                                                    })

                                            })
                                    })
                            })
                    }
                })
        })

    }
    static fetchLinksById(assetId) {
        return new Promise((resolve, reject) => {
            getLinksById(assetId)
                .then(res => {
                    //console.log(res)
                    resolve(res)
                })
        })
    }
    static fetchImagesById(assetId) {
        return new Promise((resolve, reject) => {
            getImagesById(assetId)
                .then(res => {
                    //console.log(res)
                    resolve(res)
                })
        })
    }

    static getBannerCounts() {
        let bannerObj = {};
        return new Promise((resolve, reject) => {
            const connection = getDb();
            connection.query(`select
            (select count(*) from asset_details where asset_status='Live') "asset_Count",
            (select  count(distinct a.winstory_id) from ASSET_WINSTORY_DETAILS a, asset_winstory_filter_winstory_map b where a.WINSTORY_STATUS='Live' and  a.winstory_id=b.winstory_id) "winstory_Count",
            (select count(*) from asset_hub) "hubs_Count" from dual`, {},
                {
                    outFormat: oracledb.OBJECT
                })
                .then(res => {
                    bannerObj = res[0];
                    connection.query(`select HUB_NAME from asset_hub`, {},
                        {
                            outFormat: oracledb.OBJECT
                        })
                        .then(res => {
                            bannerObj.hubs = res;
                            connection.query(`select activity_platform as platform, count(*) as count from asset_user_activity group by activity_platform`, {},
                                {
                                    outFormat: oracledb.OBJECT
                                })
                                .then(res => {
                                    bannerObj.visit = res;
                                    resolve(bannerObj)
                                })
                        })
                })
                .catch(err => {
                    reject(err)

                })
        })
    }




    static getSocialDataByAssetId(host, assetId, userId) {
        let assetSocialObj = {}
        return new Promise((resolve, reject) => {
            getCommentsById(assetId, host)
                .then(comments => {
                    assetSocialObj.COMMENTS = comments;
                    getLikesByAssetId(host, assetId)
                        .then(likes => {
                            assetSocialObj.LIKES = likes
                            getLikesByAssetIdAndUserId(assetId, userId)
                                .then(userLike => {
                                    assetSocialObj.USER_LIKE = userLike;
                                    resolve(assetSocialObj)
                                })
                        })
                })
        })
    }


    static getFilters(user_email, host) {
        console.log("fetching filters >" + user_email);
        let typeArr = [];
        let filteredArr = [];
        let allFilters = [];
        let filterObj = {};
        let userPreferencesArr = [];
        let finalFilterObj = {}
        let countArr = [];
        let winstorycountArr = [];
        let typeCountArr = [];
        let winstorytypeCountArr = [];
        let sugestionsarr = [];
        return new Promise((resolve, reject) => {
            const connection = getDb();
            connection.query(`select filter_id from asset_filter where filter_id in (Select asset_filter_id from asset_preferences where USER_EMAIL=:USER_EMAIL)`, [user_email],
                {
                    outFormat: oracledb.OBJECT
                }).then(res => {
                    res.forEach(f_id => {

                        let preferenceId = Object.values(f_id)
                        userPreferencesArr.push(preferenceId[0]);

                    })
                    connection.query(`select 
                    a.activity_filter,
                    a.activity_type,
                    b.filter_name
                    from asset_search_activity a left join asset_filter b 
                    on a.activity_filter=b.filter_id  
                    group by a.activity_filter,a.activity_type,b.filter_name 
                    order by count(*) desc,a.activity_type`, [],
                        {
                            outFormat: oracledb.OBJECT
                        })
                        .then(result => {
                            countArr = result;
                            result.forEach(filter => {
                                sugestionsarr.push(filter);
                            })
                            //console.log(JSON.stringify(countArr));
                            connection.query(`select distinct f.filter_id,count(asset_id) cnt from asset_filter f full outer join 
                            (select m.filter_id,d.asset_id from asset_filter_asset_map m join ASSET_DETAILS d on 
                            (m.asset_id=d.asset_id) where d.ASSET_STATUS='Live') a on (f.filter_id=a.filter_id) group by f.filter_id`, [],
                                {
                                    outFormat: oracledb.OBJECT
                                })
                                .then(result => {
                                    countArr = result;
                                    //console.log(JSON.stringify(countArr));
                                    connection.query(`select distinct f.filter_id,count(WINSTORY_ID) cnt from asset_filter f full outer join 
                            (select m.filter_id,d.WINSTORY_ID from asset_winstory_filter_winstory_map m join ASSET_WINSTORY_DETAILS d on 
                            (m.WINSTORY_ID=d.WINSTORY_ID) where d.WINSTORY_STATUS='Live') a on (f.filter_id=a.filter_id) group by f.filter_id`, [],
                                        {
                                            outFormat: oracledb.OBJECT
                                        })
                                        .then(result => {
                                            winstorycountArr = result;
                                            connection.query(`select * from asset_filter where FILTER_STATUS='1'`, [],
                                                {
                                                    outFormat: oracledb.OBJECT
                                                })
                                                .then(filters => {
                                                    typeArr = filters.map(f => f.FILTER_TYPE)
                                                    typeArr = [...new Set(typeArr)]
                                                    typeArr.sort(function (a, b) {
                                                        if (a < b) //sort string ascending
                                                            return -1;
                                                        if (a > b)
                                                            return 1;
                                                        return 0; //default return value (no sorting)
                                                    });
                                                    typeArr.forEach(type => {
                                                        filteredArr = filters.filter(f => f.FILTER_TYPE != null && f.FILTER_TYPE === type && f.FILTER_NAME != null && !f.FILTER_NAME.toLowerCase().includes('other'));

                                                        filterObj.Type = type;
                                                        filterObj.FILTER_TYPE_IMAGE = 'http://' + host + '/' + filteredArr[0].FILTER_TYPE_IMAGE;
                                                        filteredArr.sort((a, b) => (a.FILTER_NAME > b.FILTER_NAME) ? 1 : -1)
                                                        const otherArr = filters.filter(f => f.FILTER_TYPE != null && f.FILTER_TYPE === type && f.FILTER_NAME != null && f.FILTER_NAME.toLowerCase().includes('other'))
                                                        if (otherArr.length === 1) {
                                                            filteredArr.push(otherArr[0]);
                                                        }
                                                        else {
                                                            otherArr.forEach(o => {
                                                                filteredArr.push(o)
                                                            })
                                                        }
                                                        filteredArr.forEach(f => {
                                                            typeCountArr = countArr.filter(r => r.FILTER_ID === f.FILTER_ID)
                                                            winstorytypeCountArr = winstorycountArr.filter(r => r.FILTER_ID === f.FILTER_ID)
                                                            f.ASSET_COUNT = typeCountArr[0].CNT
                                                            f.WINSTORY_COUNT = winstorytypeCountArr[0].CNT
                                                            console.log("f.FILTER_IMAGE" + ': ' + f.FILTER_IMAGE);
                                                            f.FILTER_TYPE_IMAGE = 'http://' + host + '/' + f.FILTER_TYPE_IMAGE;
                                                            f.FILTER_IMAGE = 'http://' + host + '/' + f.FILTER_IMAGE;
                                                        })
                                                        filterObj.filters = filteredArr;

                                                        allFilters.push(filterObj);
                                                        filterObj = {};
                                                    })
                                                    finalFilterObj.allFilters = allFilters;
                                                    finalFilterObj.userPreferences = userPreferencesArr;
                                                    finalFilterObj.suggestions = sugestionsarr;
                                                    resolve(finalFilterObj)
                                                })
                                                .catch(err => {
                                                    reject(err)

                                                })
                                        })
                                })
                        })
                })
        })
    }
    static getFavAssets(user_email, host) {
        let assetsArray = [];
        let likesArray = [];
        let viewsArray = [];
        let linksArray = [];
        let imagesArray = [];
        let allAssetsObj = {};
        let allAssetsFinalArray = [];
        let commentsArray = [];
        let allObj = {};
        let linkType = [];
        var lobj2 = {};
        let lobj = {};
        let linkObjArr = [];
        let solutionAreasArray = [];
        let solutionAreas = [];
        let assetTypes = [];
        let assetTypesArray = [];
        let salesPlays = [];
        let salesPlaysArray = [];
        return new Promise((resolve, reject) => {
            const connection = getDb();
            connection.query(`select * from asset_details where asset_id in (select asset_id from asset_likes where LIKE_BY=:LIKE_BY)`, [user_email],
                {
                    outFormat: oracledb.OBJECT
                })
                .then(res => {
                    assetsArray = res
                    assetsArray.forEach(asset => {
                        asset.ASSET_THUMBNAIL = 'http://' + host + '/' + asset.ASSET_THUMBNAIL;
                    })
                    connection.query(`select Count(*) comment_count,asset_id from 
                    asset_comments group by asset_id`, [],
                        {
                            outFormat: oracledb.OBJECT
                        })
                        .then(res => {
                            //console.log("comment count",res)
                            commentsArray = res;
                            connection.execute(`SELECT count(*) like_count,asset_id from ASSET_LIKES group by asset_id`, [],
                                {
                                    outFormat: oracledb.OBJECT
                                })
                                .then(res => {
                                    //console.log("LIKES",res)
                                    likesArray = res.rows;
                                    connection.execute(`SELECT * from ASSET_IMAGES`, {},
                                        {
                                            outFormat: oracledb.OBJECT
                                        }).then(res => {
                                            imagesArray = res.rows
                                            connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Solution Area'`, {},
                                                {
                                                    outFormat: oracledb.OBJECT
                                                })
                                                .then(res => {
                                                    solutionAreasArray = res.rows;
                                                    connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Asset Type'`, {},
                                                        {
                                                            outFormat: oracledb.OBJECT
                                                        })
                                                        .then(res => {
                                                            assetTypesArray = res.rows;
                                                            connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Sales Play'`, {},
                                                                {
                                                                    outFormat: oracledb.OBJECT
                                                                })
                                                                .then(res => {
                                                                    salesPlaysArray = res.rows;
                                                                    connection.execute(`SELECT * from ASSET_LINKS  where link_active='true'`, {},
                                                                        {
                                                                            outFormat: oracledb.OBJECT
                                                                        }).then(res => {
                                                                            linksArray = res.rows
                                                                            connection.execute(`SELECT count(*) view_count,asset_id from ASSET_VIEWS group by asset_id`, [],
                                                                                {
                                                                                    outFormat: oracledb.OBJECT
                                                                                })
                                                                                .then(res => {
                                                                                    viewsArray = res.rows
                                                                                    //console.log("All Arrays",assetsArray,likesArray,viewsArray)
                                                                                    assetsArray.forEach(asset => {
                                                                                        allAssetsObj = asset;
                                                                                        allAssetsObj.createdDate = allAssetsObj.ASSET_CREATED_DATE;
                                                                                        const id = asset.ASSET_ID;
                                                                                        allAssetsObj.LINKS = [];
                                                                                        var links = linksArray.filter(link => link.ASSET_ID === id)
                                                                                        ////console.log('links:',links)
                                                                                        solutionAreas = solutionAreasArray.filter(s => s.ASSET_ID === id);
                                                                                        allAssetsObj.SOLUTION_AREAS = solutionAreas;
                                                                                        assetTypes = assetTypesArray.filter(s => s.ASSET_ID === id);
                                                                                        allAssetsObj.ASSET_TYPE = assetTypes;
                                                                                        salesPlays = salesPlaysArray.filter(s => s.ASSET_ID === id);
                                                                                        allAssetsObj.SALES_PLAY = salesPlays;
                                                                                        linkType = links.map(a => a.LINK_REPOS_TYPE)
                                                                                        linkType = [...new Set(linkType)]
                                                                                        ////console.log(linkType)
                                                                                        linkType.forEach(type => {
                                                                                            var links2 = linksArray.filter(link => link.LINK_REPOS_TYPE === type && link.ASSET_ID === id)
                                                                                            lobj.TYPE = type;
                                                                                            lobj.arr = links2;
                                                                                            lobj2 = lobj
                                                                                            linkObjArr.push(lobj2);
                                                                                            lobj = {}
                                                                                        })
                                                                                        allAssetsObj.LINKS = linkObjArr;

                                                                                        linkObjArr = [];
                                                                                        ////console.log(lobj2,"obj2")
                                                                                        var images = imagesArray.filter(image => image.ASSET_ID === id);
                                                                                        allAssetsObj.IMAGES = images;
                                                                                        var likes = likesArray.filter(l => l.ASSET_ID === id)
                                                                                        var comments = commentsArray.filter(c => c.ASSET_ID === id)
                                                                                        var views = viewsArray.filter(v => v.ASSET_ID === id)
                                                                                        if (!comments.length) {
                                                                                            comments.push({ COMMENT_COUNT: 0 });
                                                                                        }
                                                                                        if (!likes.length) {
                                                                                            likes.push({ LIKE_COUNT: 0, ASSET_ID: id })
                                                                                        }
                                                                                        if (!views.length) {
                                                                                            views.push({ VIEW_COUNT: 0, ASSET_ID: id })
                                                                                        }
                                                                                        allAssetsObj.LIKES = likes[0];
                                                                                        allAssetsObj.VIEWS = views[0];
                                                                                        allAssetsObj.COMMENTS = comments[0];
                                                                                        //console.log(allAssetsObj)
                                                                                        allAssetsFinalArray.push(allAssetsObj)
                                                                                        allAssetsObj = {};
                                                                                    })
                                                                                    allObj.TOTALCOUNT = allAssetsFinalArray.length;
                                                                                    allObj.ASSETS = allAssetsFinalArray;
                                                                                    resolve(allObj)
                                                                                })
                                                                        })
                                                                })
                                                        })
                                                })
                                        })
                                })
                        })
                })
        })
    }



    static getFavAssets(user_email, host) {
        let assetsArray = [];
        let likesArray = [];
        let viewsArray = [];
        let linksArray = [];
        let imagesArray = [];
        let allAssetsObj = {};
        let allAssetsFinalArray = [];
        let commentsArray = [];
        let allObj = {};
        let linkType = [];
        var lobj2 = {};
        let lobj = {};
        let linkObjArr = [];
        let solutionAreasArray = [];
        let solutionAreas = [];
        let assetTypes = [];
        let assetTypesArray = [];
        let salesPlays = [];
        let salesPlaysArray = [];
        let promotedArray = [];
        return new Promise((resolve, reject) => {
            const connection = getDb();
            connection.query(`select * from asset_details where asset_id in (select asset_id from asset_likes where LIKE_BY=:LIKE_BY)`, [user_email],
                {
                    outFormat: oracledb.OBJECT
                })
                .then(res => {
                    assetsArray = res
                    assetsArray.forEach(asset => {
                        asset.ASSET_THUMBNAIL = 'http://' + host + '/' + asset.ASSET_THUMBNAIL;
                    })
                    connection.query(`select Count(*) comment_count,asset_id from 
                    asset_comments group by asset_id`, [],
                        {
                            outFormat: oracledb.OBJECT
                        })
                        .then(res => {
                            //console.log("comment count",res)
                            commentsArray = res;
                            connection.execute(`SELECT count(*) like_count,asset_id from ASSET_LIKES group by asset_id`, [],
                                {
                                    outFormat: oracledb.OBJECT
                                })
                                .then(res => {
                                    //console.log("LIKES",res)
                                    likesArray = res.rows;
                                    connection.execute(`SELECT * from ASSET_IMAGES`, {},
                                        {
                                            outFormat: oracledb.OBJECT
                                        }).then(res => {
                                            imagesArray = res.rows
                                            connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Solution Area'`, {},
                                                {
                                                    outFormat: oracledb.OBJECT
                                                })
                                                .then(res => {
                                                    solutionAreasArray = res.rows;
                                                    connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Asset Type'`, {},
                                                        {
                                                            outFormat: oracledb.OBJECT
                                                        })
                                                        .then(res => {
                                                            assetTypesArray = res.rows;
                                                            connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Sales Play'`, {},
                                                                {
                                                                    outFormat: oracledb.OBJECT
                                                                })
                                                                .then(res => {
                                                                    salesPlaysArray = res.rows;
                                                                    connection.execute(`SELECT asset_id from ASSET_LOB_LEADER_PROMOTED_ASSETS where status=1`, [],
                                                                        {
                                                                            outFormat: oracledb.OBJECT
                                                                        })
                                                                        .then(res => {
                                                                            promotedArray = res.rows;
                                                                            connection.execute(`SELECT * from ASSET_LINKS  where link_active='true'`, {},
                                                                                {
                                                                                    outFormat: oracledb.OBJECT
                                                                                }).then(res => {
                                                                                    linksArray = res.rows
                                                                                    connection.execute(`SELECT count(*) view_count,asset_id from ASSET_VIEWS group by asset_id`, [],
                                                                                        {
                                                                                            outFormat: oracledb.OBJECT
                                                                                        })
                                                                                        .then(res => {
                                                                                            viewsArray = res.rows
                                                                                            //console.log("All Arrays",assetsArray,likesArray,viewsArray)
                                                                                            assetsArray.forEach(asset => {
                                                                                                allAssetsObj = asset;
                                                                                                allAssetsObj.createdDate = allAssetsObj.ASSET_CREATED_DATE;
                                                                                                const id = asset.ASSET_ID;
                                                                                                allAssetsObj.LINKS = [];
                                                                                                var links = linksArray.filter(link => link.ASSET_ID === id)
                                                                                                ////console.log('links:',links)
                                                                                                solutionAreas = solutionAreasArray.filter(s => s.ASSET_ID === id);
                                                                                                allAssetsObj.SOLUTION_AREAS = solutionAreas;
                                                                                                assetTypes = assetTypesArray.filter(s => s.ASSET_ID === id);
                                                                                                allAssetsObj.ASSET_TYPE = assetTypes;
                                                                                                salesPlays = salesPlaysArray.filter(s => s.ASSET_ID === id);
                                                                                                allAssetsObj.SALES_PLAY = salesPlays;
                                                                                                linkType = links.map(a => a.LINK_REPOS_TYPE)
                                                                                                linkType = [...new Set(linkType)]
                                                                                                let promote = promotedArray.filter(s => s.ASSET_ID === id);
                                                                                                allAssetsObj.PROMOTE = promote.length == 0 ? false : true;
                                                                                                ////console.log(linkType)
                                                                                                linkType.forEach(type => {
                                                                                                    var links2 = linksArray.filter(link => link.LINK_REPOS_TYPE === type && link.ASSET_ID === id)
                                                                                                    lobj.TYPE = type;
                                                                                                    lobj.arr = links2;
                                                                                                    lobj2 = lobj
                                                                                                    linkObjArr.push(lobj2);
                                                                                                    lobj = {}
                                                                                                })
                                                                                                allAssetsObj.LINKS = linkObjArr;

                                                                                                linkObjArr = [];
                                                                                                ////console.log(lobj2,"obj2")
                                                                                                var images = imagesArray.filter(image => image.ASSET_ID === id);
                                                                                                allAssetsObj.IMAGES = images;
                                                                                                var likes = likesArray.filter(l => l.ASSET_ID === id)
                                                                                                var comments = commentsArray.filter(c => c.ASSET_ID === id)
                                                                                                var views = viewsArray.filter(v => v.ASSET_ID === id)
                                                                                                if (!comments.length) {
                                                                                                    comments.push({ COMMENT_COUNT: 0 });
                                                                                                }
                                                                                                if (!likes.length) {
                                                                                                    likes.push({ LIKE_COUNT: 0, ASSET_ID: id })
                                                                                                }
                                                                                                if (!views.length) {
                                                                                                    views.push({ VIEW_COUNT: 0, ASSET_ID: id })
                                                                                                }
                                                                                                allAssetsObj.LIKES = likes[0];
                                                                                                allAssetsObj.VIEWS = views[0];
                                                                                                allAssetsObj.COMMENTS = comments[0];
                                                                                                //console.log(allAssetsObj)
                                                                                                allAssetsFinalArray.push(allAssetsObj)
                                                                                                allAssetsObj = {};
                                                                                            })
                                                                                            allObj.TOTALCOUNT = allAssetsFinalArray.length;
                                                                                            allObj.ASSETS = allAssetsFinalArray;
                                                                                            resolve(allObj)
                                                                                        })
                                                                                })
                                                                        })
                                                                })
                                                        })
                                                })
                                        })
                                })
                        })
                })
        })
    }

    static getAssetsByLob(lob, host) {
        let assetsArray = [];
        let likesArray = [];
        let viewsArray = [];
        let linksArray = [];
        let imagesArray = [];
        let allAssetsObj = {};
        let allAssetsFinalArray = [];
        let commentsArray = [];
        let allObj = {};
        let linkType = [];
        var lobj2 = {};
        let lobj = {};
        let linkObjArr = [];
        let solutionAreasArray = [];
        let solutionAreas = [];
        let assetTypes = [];
        let assetTypesArray = [];
        let salesPlays = [];
        let salesPlaysArray = [];
        let promotedArray = [];
        let industryArray = []
        let industry = [];
        return new Promise((resolve, reject) => {
            const connection = getDb();
            let lobQuerySql;
            let lobQueryOptions;
            let promoteQuerySql;
            let promoteQueryOptions;
            if (lob !== 'Others') {
                lobQuerySql = `select * from asset_details where asset_id in (select asset_id from asset_lob_asset_map where lob_id in (select lob_id from asset_lobs where lob_name=:LOB_NAME or lob_name='Others')) and asset_status='Live'`
                lobQueryOptions = [lob]
                promoteQuerySql = `SELECT asset_id from ASSET_LOB_LEADER_PROMOTED_ASSETS where status=1 and (LOB_LEADER_LOB=:LOB_NAME or LOB_LEADER_LOB='Others')`
                promoteQueryOptions = [lob];
            }
            else {
                lobQuerySql = `select * from asset_details where asset_id in (select distinct asset_id from asset_lob_asset_map) and asset_status='Live'`;
                lobQueryOptions = [];
                promoteQuerySql = `SELECT asset_id from ASSET_LOB_LEADER_PROMOTED_ASSETS where status=1`
                promoteQueryOptions = [];
            }
            connection.query(lobQuerySql, lobQueryOptions,
                {
                    outFormat: oracledb.OBJECT
                })
                .then(res => {
                    assetsArray = res
                    assetsArray.forEach(asset => {
                        asset.ASSET_THUMBNAIL = 'http://' + host + '/' + asset.ASSET_THUMBNAIL;
                    })
                    connection.query(`select Count(*) comment_count,asset_id from 
                    asset_comments group by asset_id`, [],
                        {
                            outFormat: oracledb.OBJECT
                        })
                        .then(res => {
                            //console.log("comment count",res)
                            commentsArray = res;
                            connection.execute(`SELECT count(*) like_count,asset_id from ASSET_LIKES group by asset_id`, [],
                                {
                                    outFormat: oracledb.OBJECT
                                })
                                .then(res => {
                                    //console.log("LIKES",res)
                                    likesArray = res.rows;
                                    connection.execute(`SELECT * from ASSET_IMAGES`, {},
                                        {
                                            outFormat: oracledb.OBJECT
                                        }).then(res => {
                                            imagesArray = res.rows
                                            connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Solution Area'`, {},
                                                {
                                                    outFormat: oracledb.OBJECT
                                                })
                                                .then(res => {
                                                    solutionAreasArray = res.rows;
                                                    connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Asset Type'`, {},
                                                        {
                                                            outFormat: oracledb.OBJECT
                                                        })
                                                        .then(res => {
                                                            assetTypesArray = res.rows;

                                                            connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Industry'`, {},
                                                                {
                                                                    outFormat: oracledb.OBJECT
                                                                })
                                                                .then(res => {
                                                                    industryArray = res.rows;
                                                                    connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Sales Play'`, {},
                                                                        {
                                                                            outFormat: oracledb.OBJECT
                                                                        })
                                                                        .then(res => {
                                                                            salesPlaysArray = res.rows;
                                                                            connection.execute(`SELECT * from ASSET_LINKS  where link_active='true'`, {},
                                                                                {
                                                                                    outFormat: oracledb.OBJECT
                                                                                }).then(res => {
                                                                                    linksArray = res.rows
                                                                                    connection.query(promoteQuerySql, promoteQueryOptions,
                                                                                        {
                                                                                            outFormat: oracledb.OBJECT
                                                                                        })
                                                                                        .then(res => {
                                                                                            promotedArray = res;
                                                                                            connection.execute(`SELECT count(*) view_count,asset_id from ASSET_VIEWS group by asset_id`, [],
                                                                                                {
                                                                                                    outFormat: oracledb.OBJECT
                                                                                                })
                                                                                                .then(res => {
                                                                                                    viewsArray = res.rows
                                                                                                    //console.log("All Arrays",assetsArray,likesArray,viewsArray)
                                                                                                    assetsArray.forEach(asset => {
                                                                                                        allAssetsObj = asset;
                                                                                                        const id = asset.ASSET_ID;
                                                                                                        allAssetsObj.createdDate = allAssetsObj.ASSET_CREATED_DATE;
                                                                                                        allAssetsObj.LINKS = [];
                                                                                                        var links = linksArray.filter(link => link.ASSET_ID === id);
                                                                                                        solutionAreas = solutionAreasArray.filter(s => s.ASSET_ID === id);
                                                                                                        allAssetsObj.SOLUTION_AREAS = solutionAreas;
                                                                                                        industry = industryArray.filter(s => s.ASSET_ID === id);
                                                                                                        allAssetsObj.INDUSTRY = industry;
                                                                                                        assetTypes = assetTypesArray.filter(s => s.ASSET_ID === id);
                                                                                                        allAssetsObj.ASSET_TYPE = assetTypes;
                                                                                                        salesPlays = salesPlaysArray.filter(s => s.ASSET_ID === id);
                                                                                                        allAssetsObj.SALES_PLAY = salesPlays;
                                                                                                        let promote = promotedArray.filter(s => s.ASSET_ID === id);
                                                                                                        allAssetsObj.PROMOTE = promote.length == 0 ? false : true;
                                                                                                        linkType = links.map(a => a.LINK_REPOS_TYPE)
                                                                                                        linkType = [...new Set(linkType)]
                                                                                                        linkType.forEach(type => {
                                                                                                            var links2 = linksArray.filter(link => link.LINK_REPOS_TYPE === type && link.ASSET_ID === id)
                                                                                                            lobj.TYPE = type;
                                                                                                            lobj.arr = links2;
                                                                                                            lobj2 = lobj
                                                                                                            linkObjArr.push(lobj2);
                                                                                                            lobj = {}
                                                                                                        })
                                                                                                        allAssetsObj.LINKS = linkObjArr;

                                                                                                        linkObjArr = [];
                                                                                                        ////console.log(lobj2,"obj2")
                                                                                                        var images = imagesArray.filter(image => image.ASSET_ID === id);
                                                                                                        allAssetsObj.IMAGES = images;
                                                                                                        var likes = likesArray.filter(l => l.ASSET_ID === id)
                                                                                                        var comments = commentsArray.filter(c => c.ASSET_ID === id)
                                                                                                        var views = viewsArray.filter(v => v.ASSET_ID === id)
                                                                                                        if (!comments.length) {
                                                                                                            comments.push({ COMMENT_COUNT: 0 });
                                                                                                        }
                                                                                                        if (!likes.length) {
                                                                                                            likes.push({ LIKE_COUNT: 0, ASSET_ID: id })
                                                                                                        }
                                                                                                        if (!views.length) {
                                                                                                            views.push({ VIEW_COUNT: 0, ASSET_ID: id })
                                                                                                        }
                                                                                                        allAssetsObj.LIKES = likes[0];
                                                                                                        allAssetsObj.VIEWS = views[0];
                                                                                                        allAssetsObj.COMMENTS = comments[0];
                                                                                                        //console.log(allAssetsObj)
                                                                                                        allAssetsFinalArray.push(allAssetsObj)
                                                                                                        allAssetsObj = {};
                                                                                                    })
                                                                                                    allObj.TOTALCOUNT = allAssetsFinalArray.length;
                                                                                                    allObj.ASSETS = allAssetsFinalArray;
                                                                                                    resolve(allObj)
                                                                                                })
                                                                                        })
                                                                                })
                                                                        })
                                                                })
                                                        })
                                                })
                                        })
                                })
                        })
                })
        })
    }

    static getMyAssets(user_email, host) {
        let assetsArray = [];
        let likesArray = [];
        let viewsArray = [];
        let allAssetsObj = {};
        let allAssetsFinalArray = [];
        let commentsArray = [];
        let statusArr = [];
        let filteredAssetsArray = [];
        let statusObj = {};
        let finalArr = [];
        let allStatusList = ['Pending Review', 'Live', 'Pending Rectification', 'Reject'];
        let tempStatusArr = [];
        return new Promise((resolve, reject) => {
            const connection = getDb();
            connection.query(`select * from asset_details where ASSET_CREATEDBY=:ASSET_CREATEDBY or ASSET_OWNER like :ASSET_OWNER`, [user_email, '%' + user_email + '%'],
                {
                    outFormat: oracledb.OBJECT
                })
                .then(res => {
                    res.forEach(element => {
                        element.ASSET_REVIEW_NOTE = JSON.parse(element.ASSET_REVIEW_NOTE)

                    });
                    assetsArray = res
                    assetsArray.forEach(asset => {
                        asset.ASSET_THUMBNAIL = 'http://' + host + '/' + asset.ASSET_THUMBNAIL;
                    })
                    connection.query(`select Count(*) comment_count,asset_id from 
                    asset_comments group by asset_id`, [],
                        {
                            outFormat: oracledb.OBJECT
                        })
                        .then(res => {
                            //console.log("comment count",res)
                            commentsArray = res;
                            connection.execute(`SELECT count(*) like_count,asset_id from ASSET_LIKES group by asset_id`, [],
                                {
                                    outFormat: oracledb.OBJECT
                                })
                                .then(res => {
                                    //console.log("LIKES",res)
                                    likesArray = res.rows;
                                    connection.execute(`SELECT count(*) view_count,asset_id from ASSET_VIEWS group by asset_id`, [],
                                        {
                                            outFormat: oracledb.OBJECT
                                        })
                                        .then(res => {
                                            viewsArray = res.rows

                                            statusArr = assetsArray.map(a => a.ASSET_STATUS)
                                            statusArr = [...new Set(statusArr)];

                                            //console.log("status Array",statusArr)

                                            tempStatusArr = allStatusList.filter(s => statusArr.indexOf(s) === -1)
                                            //console.log("temp status arr", tempStatusArr)



                                            statusArr = [...statusArr, ...tempStatusArr]

                                            statusArr = [...new Set(statusArr)];

                                            //console.log("updated status arr", statusArr)

                                            statusArr.forEach(status => {                                                             //loop each asset status type
                                                //console.log(status)
                                                filteredAssetsArray = assetsArray.filter(a => a.ASSET_STATUS === status)
                                                statusObj.status = status;
                                                //console.log("filteredAssetsArray", filteredAssetsArray) 
                                                filteredAssetsArray.forEach(asset => {           //loop each asset for current status type
                                                    allAssetsObj = asset;
                                                    const id = asset.ASSET_ID;
                                                    var likes = likesArray.filter(l => l.ASSET_ID === id)
                                                    var comments = commentsArray.filter(c => c.ASSET_ID === id)
                                                    var views = viewsArray.filter(v => v.ASSET_ID === id)
                                                    if (!comments.length) {
                                                        comments.push({ COMMENT_COUNT: 0 });
                                                    }
                                                    if (!likes.length) {
                                                        likes.push({ LIKE_COUNT: 0, ASSET_ID: id })
                                                    }
                                                    if (!views.length) {
                                                        views.push({ VIEW_COUNT: 0, ASSET_ID: id })
                                                    }
                                                    allAssetsObj.LIKES = likes[0];
                                                    allAssetsObj.VIEWS = views[0];
                                                    allAssetsObj.COMMENTS = comments[0];
                                                    allAssetsFinalArray.push(allAssetsObj)
                                                    allAssetsObj = {};
                                                })
                                                statusObj.arr = allAssetsFinalArray;
                                                allAssetsFinalArray = [];
                                                finalArr.push(statusObj)
                                                statusObj = {};
                                            })

                                            resolve(finalArr)
                                        })
                                })
                        })
                })
        })
    }


    static getLocations() {
        return new Promise((resolve, reject) => {
            let dataObj = {};
            let pillarObj = {};
            let pillarArr = [];
            const connection = getDb();
            connection.query(`select HUB_NAME from asset_hub`, {},
                {
                    outFormat: oracledb.OBJECT
                })
                .then(res => {
                    dataObj.locations = res
                    connection.query(`select filter_name from asset_filter where filter_type='Solution Area'`, {},
                        {
                            outFormat: oracledb.OBJECT
                        }).then(res => {
                            res.forEach(p => {
                                pillarObj.PILLAR_NAME = p.FILTER_NAME
                                pillarArr.push(pillarObj)
                                pillarObj = {};

                            })
                            dataObj.pillars = pillarArr
                            connection.query(`select LOB_ID,LOB_NAME from ASSET_LOBS`, {},
                                {
                                    outFormat: oracledb.OBJECT
                                })
                                .then(result => {
                                    dataObj.lobs = result
                                    resolve(dataObj)
                                })
                        })

                })
        })

    }


    static addUserPreference(user_name, user_email, filters, action) {
        let filterObj = {};
        let filterArr = [];
        // //console.log(filters)
        return new Promise((resolve, reject) => {
            if (filters.length !== 0) {
                filters.forEach(f => {
                    filterObj.USER_NAME = user_name;
                    filterObj.USER_EMAIL = user_email;
                    filterObj.ASSET_FILTER_ID = f;
                    filterArr.push(filterObj)
                    filterObj = {};
                })
            }
            const connection = getDb();

            connection.execute(`DELETE from ASSET_PREFERENCES WHERE USER_EMAIL=:USER_EMAIL`, [user_email],
                {
                    autoCommit: true,
                    outFormat: oracledb.Object
                })
                .then(res => {
                    if (filters.length === 0) {
                        resolve({ status: "Preference Registered successfully" })
                    }

                    connection.batchInsert(`INSERT into ASSET_PREFERENCES(USER_NAME,USER_EMAIL,ASSET_FILTER_ID) values(:USER_NAME,:USER_EMAIL,:ASSET_FILTER_ID)`,
                        filterArr,
                        {
                            outFormat: oracledb.OBJECT,
                            autoCommit: true,
                        })
                        .then(res => {
                            resolve({ status: "Preferences Registered successfully" })
                        })
                })
        })

    }

    static savefeedback(email, assetid, feedback, res) {
        const connection = getDb();
        let saveFeedbackSql = `insert into asset_feedback (FEEDBACK_RESPONSE,ASSET_ID,FEEDBACK_BY,FEEDBACK_CREATEDON) values(:0,:1,:2,:3)`;
        let saveFeedbackOptions = [feedback, assetid, email, new Date()];

        connection.execute(saveFeedbackSql, saveFeedbackOptions, {
            autoCommit: true
        }).then(result => {
            if (result.rowsAffected === 0) {
                //console.log("Could not capture feedback. . .");
                res.status(404).json({ status: "FAILED", msg: "Could not capture feedback " });
            } else {
                //console.log("feedback is captured. . .");
                res.json({ status: "feedback saved successfully" })
            }

        }).catch(err => {
            //console.log("Error occurred while saving feedback : " + JSON.stringify(err));
            res.status(500).json({ status: "feedback captured failed", msg: JSON.stringify(err) })
        })
    }
    static getHelpAndSupportModal() {
        const connection = getDb();
        return new Promise((resolve, reject) => {
            connection.query(`select * from ASSET_HELP_SUPPORT`, {},
                {
                    outFormat: oracledb.OBJECT
                })
                .then(result => {
                    //console.log(result)
                    resolve(result)
                }).catch(err => {
                    console.log(err)
                })
        })
    }
    static SaveHelpAndSupportModal(data, res) {
        const connection = getDb();
        return new Promise((resolve, reject) => {
            var sql = `UPDATE ASSET_HELP_SUPPORT 
        SET PROMO_VIDEO_URL=:PROMO_VIDEO_URL, PROMO_CONTENT=:PROMO_CONTENT,USER_GUIDE=:USER_GUIDE,USER_GUIDE_URL=:USER_GUIDE_URL
         WHERE  ITEM_ID=:ITEM_ID`;
            var options = [data.promo_video_url, data.promo_content, data.user_guide, data.user_guide_url, 1];
            connection.update(sql, options,
                {
                    outFormat: oracledb.Object,
                    autoCommit: true
                })
                .then(result => {
                    if (result.rowsAffected === 0) {
                        //console.log("Could not capture feedback. . .");
                        resolve({ status: "FAILED", msg: "Could not capture promo content " });
                    } else {
                        //console.log("feedback is captured. . .");
                        resolve({ status: "Promo content updated successfully" });
                    }

                })
                .catch(err => {
                    //console.log(err)
                    resolve({ status: "promo content captured failed", msg: JSON.stringify(err) })
                })
        })
    }

}
