const getDb = require('../../database/db').getDb;

var uniqid = require('uniqid');
const oracledb = require('oracledb');
const path = require('path');
//console.log=function(){}

const generateFileName = (sampleFile, assetId, filesArray, imageDescription) => {
    let imgObject = {};
    let fname = sampleFile.name.split('.')[0];
    fname = fname.replace(/ /g, '');

    const ftype = sampleFile.name.split('.')[1];
    const uniqueId = uniqid();
    const finalFname = fname + uniqueId.concat('.', ftype);
    const uploadPath = path.join(__dirname, '../../public/', finalFname);
    var content = `http://129.213.72.248:8001/${finalFname}`

    //var content=`http://localhost:3002/${finalFname}`
    imgObject.IMAGE_ID = uniqueId;
    imgObject.WINSTORY_ID = assetId;
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
    console.log("WIn Count :::: " + tAssets.length);
    if (sortBy && order === 'asc') {
        // //console.log("asc order")
        if (sortBy === 'ratings') {
            //  //console.log("sortBy ratings")
            tAssets.sort((a, b) => a.RATINGS.AVG_RATING > b.RATINGS.AVG_RATING ? 1 : -1);
        }
        else if (sortBy === 'createdDate') {
            tAssets.sort((a, b) => a.WINSTORY_CREATED_ON > b.WINSTORY_CREATED_ON ? 1 : -1);
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
            tAssets.sort((a, b) => a.WINSTORY_CREATED_ON < b.WINSTORY_CREATED_ON ? 1 : -1);
        }
        else if (sortBy === 'likes') {
            tAssets.sort((a, b) => a.LIKES.LIKE_COUNT < b.LIKES.LIKE_COUNT ? 1 : -1);
        }
        else if (sortBy === 'views') {
            //tAssets.sort((a, b) => a.VIEWS.VIEW_COUNT < b.VIEWS.VIEW_COUNT ? 1 : -1);
            tAssets.sort(function (a, b) { return b.VIEWS.VIEW_COUNT - a.VIEWS.VIEW_COUNT })
        }
    }
}
const getwinstoryById = (assetId) => {
    const connection = getDb();
    return connection.query(`SELECT * from ASSET_WINSTORY_DETAILS where WINSTORY_ID=:WINSTORY_ID`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}

const getRatingsById = (assetId) => {
    const connection = getDb();
    return connection.query(`SELECT * from ASSET_WINSTORY_RATES where WINSTORY_ID=:WINSTORY_ID`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}


const getLinksById = (assetId) => {
    const connection = getDb();
    return connection.query(`SELECT * from ASSET_WINSTORY_LINKS  where link_active='true' and WINSTORY_ID=:WINSTORY_ID`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}
const getPromoteById = (assetId) => {
    const connection = getDb();
    return connection.query(`SELECT * from ASSET_WINSTORY_LOB_LEADER_PROMOTED_WINSTORY  where WINSTORY_ID=:WINSTORY_ID and status=1`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}

const getImagesById = (assetId) => {
    const connection = getDb();
    return connection.query(`SELECT * from ASSET_IMAGES where ASSET_ID=:WINSTORY_ID`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}

// const getCommentsById=(assetId)=>{
//     const connection=getDb();
//     return connection.query(`SELECT * from ASSET_COMMENTS where WINSTORY_ID=:WINSTORY_ID`,[assetId],
//     {
//         outFormat:oracledb.OBJECT
//     })
// }

const getCommentsById = (assetId) => {
    const connection = getDb();
    return connection.query(`select COMMENT_ID,
    COMMENT_COMMENT,
    COMMENTBY,
    COMMENTON,
    WINSTORY_ID,
    COMMENT_USERNAME,
    case when USER_PROFILE_IMAGE is null then null
    else 'http://129.213.72.248:8001/'||USER_PROFILE_IMAGE
    end  USER_PROFILE_IMAGE
    from asset_winstory_comments c  full outer join asset_user u on (c.commentby=u.user_email)where WINSTORY_ID=:WINSTORY_ID`,
        [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}


const getAssetFilterMapByIdandType = (assetId) => {
    const connection = getDb();
    return connection.query(`select m.filter_id,filter_type from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where WINSTORY_ID=:WINSTORY_ID`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}

const getSolutionAreasByAssetId = (assetId) => {
    const connection = getDb();
    return connection.query(`select m.filter_id,filter_type,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where  WINSTORY_ID=:WINSTORY_ID and filter_type='Solution Area'`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}
const getSalesPlayByAssetId = (assetId) => {
    const connection = getDb();
    return connection.query(`select m.filter_id,filter_type,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where  WINSTORY_ID=:WINSTORY_ID and filter_type='Sales Play'`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}
const getIndustryByAssetId = (assetId) => {
    const connection = getDb();
    return connection.query(`select m.filter_id,filter_type,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where  WINSTORY_ID=:WINSTORY_ID and filter_type='Industry'`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}
const getAssetTypesByAssetId = (assetId) => {
    const connection = getDb();
    return connection.query(`select m.filter_id,filter_type,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where  WINSTORY_ID=:WINSTORY_ID and filter_type='Asset Type'`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}
const getWinStatusByAssetId = (assetId) => {
    const connection = getDb();
    return connection.query(`select m.filter_id,filter_type,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where  WINSTORY_ID=:WINSTORY_ID and filter_type='Win Status'`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}


const getLikesCountByAssetId = (assetId) => {
    const connection = getDb();
    return connection.query(`select count(*) like_count from ASSET_LIKES where WINSTORY_ID=:WINSTORY_ID`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}


const getLikesByAssetId = (assetId) => {
    const connection = getDb();
    return connection.query(`select
    LIKE_ID,
    WINSTORY_ID,
    LIKE_BY,
    LIKE_CREATED,
    LIKE_USERNAME ,
    case when USER_PROFILE_IMAGE is null then null
    else 'http://129.213.72.248:8001/'||USER_PROFILE_IMAGE
    end  USER_PROFILE_IMAGE
    from asset_likes l  full outer join asset_user u on (l.like_by=u.user_email)where WINSTORY_ID=:WINSTORY_ID`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}


const getLikesByAssetIdAndUserId = (assetId, userId) => {
    const connection = getDb();
    return connection.query(`select * from ASSET_LIKES where WINSTORY_ID=:WINSTORY_ID and LIKE_BY=:LIKE_BY`, [assetId, userId],
        {
            outFormat: oracledb.OBJECT
        })
}

module.exports = class Asset {
    constructor(assetId, title, description, usercase, customer, createdBy,
        createdDate, scrmId, oppId,
        thumbnail, modifiedDate, modifiedBy, filters, links, expiryDate, video_link, location, owner, asset_architecture_description) {
        this.assetId = assetId;
        this.title = title;
        this.description = description;
        this.usercase = usercase;
        this.customer = customer;
        this.createdBy = createdBy;
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
        this.owner = owner;
        this.asset_architecture_description = asset_architecture_description
    }

    save() {

        return new Promise((resolve, reject) => {
            var assetid = this.assetId;
            var self = this;
            const connection = getDb();
            let filterObj = {};
            let filterArr = [];
            // console.log("------------------ SAVEING ASSET -----------------");
            // console.log(JSON.stringify(self));/

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
                        filterObj.WINSTORY_ID = assetid;
                        filterArr.push(filterObj)
                        filterObj = {};
                    })
                }
                else if (this.filters.length === 1) {
                    filterObj.FILTER_ASSET_MAP_ID = uniqid.process();
                    filterObj.FILTER_ID = this.filters[0].Value;
                    filterObj.WINSTORY_ID = assetid;
                    filterArr.push(filterObj)
                }
                else {
                    filterArr = null;
                }
                const oj = this.links;
                if (!(oj === null)) {
                    oj.forEach(link => {
                        // linkObj={LINK_ID:uniqid.process(),WINSTORY_ID:assetid,...link}
                        // return linkObj
                        link.LINK_ID = uniqid.process();
                        link.WINSTORY_ID = self.assetId;
                    })
                }

                connection.transaction([
                    function firstAction() {
                        return connection.update(`UPDATE asset_winstory_details set 
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
        ASSET_ARCHITECTURE_DESCRIPTION=:ASSET_ARCHITECTURE_DESCRIPTION
             WHERE WINSTORY_ID=:WINSTORY_ID`,
                            [self.title, self.description, self.usercase, self.customer, self.createdBy,
                            self.scrmId, self.oppId, new Date(), self.modifiedBy, self.expiryDate, self.video_link, self.location, self.owner, 'Pending Review', self.asset_architecture_description, self.assetId],
                            {
                                outFormat: oracledb.Object
                            }).then(res => {
                                console.log('1st update done(Asset details updated)')
                            })
                    }
                    , function secondAction() {
                        if (oj.length > 0) {
                            // console.log("statement:", oj)
                            return connection.execute(`delete from ASSET_LINKS  WHERE WINSTORY_ID=:WINSTORY_ID`, [self.assetId]
                                , {
                                    autoCommit: true
                                }
                            ).then(res => {
                                console.log('2nd update done(Asset links updated)' + res)
                                connection.batchInsert(`INSERT into ASSET_LINKS(LINK_URL_TYPE,LINK_URL,LINK_REPOS_TYPE,LINK_DESCRIPTION,LINK_DESCRIPTION_DATA,DEPLOY_STATUS,LINK_ID,WINSTORY_ID) values(
                                    :LINK_URL_TYPE,:LINK_URL,:LINK_REPOS_TYPE,:LINK_DESCRIPTION,:LINK_DESCRIPTION_DATA,:DEPLOY_STATUS,:LINK_ID,:WINSTORY_ID)`,
                                    oj, {
                                    autoCommit: true
                                })
                            })
                        }
                        else {
                            return connection.query(`SELECT * from asset_links where link_active='true'`, {})
                        }
                    }, function thirdAction() {
                        if (filterArr.length > 0) {
                            // console.log(filterArr)
                            return connection.execute(`delete from asset_winstory_filter_winstory_map WHERE WINSTORY_ID=:WINSTORY_ID`, [self.assetId],
                                {
                                    autocommit: true
                                }
                            ).then(res => {
                                connection.batchInsert(`INSERT into asset_winstory_filter_winstory_map values(
                            :FILTER_ASSET_MAP_ID,:FILTER_ID,:WINSTORY_ID)`, filterArr,
                                    {
                                        outFormat: oracledb.Object
                                    }).then(res => {
                                        console.log("filters inserted successfully")
                                    })
                            })
                        }
                        else {
                            return connection.query(`SELECT * from asset_winstory_filter_winstory_map`, {})
                        }
                    }], {
                    sequence: true
                })
                    .then(function onTransactionResults(output) {
                        console.log('Update transaction successful');
                        resolve("updated")
                    })
                    .catch(err => {
                        console.log(err)
                    })
            }
            else {
                this.assetId = uniqid.process('AH-');
                assetid = this.assetId;
                console.log(this.assetId, self.links)
                if (!this.filters) {
                    this.filters = []
                }
                if (this.filters.length > 1) {
                    this.filters.forEach(f => {
                        filterObj.FILTER_ASSET_MAP_ID = uniqid.process();
                        filterObj.FILTER_ID = f.Value;
                        filterObj.WINSTORY_ID = assetid;
                        filterArr.push(filterObj)
                        filterObj = {};
                    })
                }
                else if (this.filters.length === 1) {
                    filterObj.FILTER_ASSET_MAP_ID = uniqid.process();
                    filterObj.FILTER_ID = this.filters[0].Value;
                    filterObj.WINSTORY_ID = assetid;
                    filterArr.push(filterObj)
                }
                else {
                    filterArr = null;
                }
                let oj = this.links;

                console.log("MODEL LINK1", oj)
                if (!(oj === null)) {
                    oj.forEach(link => {
                        // linkObj={LINK_ID:uniqid.process(),WINSTORY_ID:assetid,...link}
                        // return linkObj
                        link.LINK_ID = uniqid.process();
                        link.WINSTORY_ID = assetid;
                    })
                }

                // console.log("FilterArr", filterArr)
                // console.log("MODEL LINK2", oj)

                connection.transaction([
                    function firstAction() {
                        return connection.insert(`INSERT into asset_winstory_details(WINSTORY_ID,ASSET_TITLE,ASSET_DESCRIPTION,
                ASSET_USERCASE,ASSET_CUSTOMER,ASSET_CREATEDBY,ASSET_CREATED_DATE,ASSET_SCRM_ID,ASSET_OPP_ID,
                ASSET_THUMBNAIL,ASSET_MODIFIED_DATE,ASSET_MODIFIED_BY,ASSET_VIDEO_URL,ASSET_EXPIRY_DATE,ASSET_VIDEO_LINK,ASSET_LOCATION,ASSET_OWNER,ASSET_STATUS,ASSET_ARCHITECTURE_DESCRIPTION) values(:WINSTORY_ID,:ASSET_TITLE,:ASSET_DESCRIPTION,
                :ASSET_USERCASE,:ASSET_CUSTOMER,:ASSET_CREATEDBY,:CREATED_DATE,:ASSET_SCRM_ID,:ASSET_OPP_ID,
                :ASSET_THUMBNAIL,:ASSET_MODIFIED_DATE,:ASSET_MODIFIED_BY,:ASSET_VIDEO_URL,:ASSET_EXPIRY_DATE,:ASSET_VIDEO_LINK,:ASSET_LOCATION,:ASSET_OWNER,:ASSET_STATUS,:ASSET_ARCHITECTURE_DESCRIPTION)`,
                            [assetid, self.title, self.description, self.usercase, self.customer, self.createdBy,
                                self.createdDate, self.scrmId, self.oppId, self.thumbnail, self.modifiedDate, self.modifiedBy, self.ASSET_VIDEO_URL, self.expiryDate, self.video_link, self.location, self.owner, 'Pending Review', self.asset_architecture_description],
                            {
                                outFormat: oracledb.Object
                            }).then(res => {
                                console.log('1st insert done(Asset details inserted)')
                            })
                    }
                    , function secondAction() {
                        if (oj.length > 0) {
                            return connection.batchInsert(`INSERT into ASSET_LINKS(LINK_URL_TYPE,LINK_URL,LINK_REPOS_TYPE,LINK_DESCRIPTION,LINK_DESCRIPTION_DATA,DEPLOY_STATUS,LINK_ID,WINSTORY_ID) values(
                :LINK_URL_TYPE,:LINK_URL,:LINK_REPOS_TYPE,:LINK_DESCRIPTION,:LINK_DESCRIPTION_DATA,:DEPLOY_STATUS,:LINK_ID,:WINSTORY_ID)`,
                                oj, {
                                autocommit: true
                            }
                            )
                        }
                        else {
                            // console.log("oj is empty")
                            return connection.query(`SELECT * from asset_links where link_active='true'`, {})
                        }
                    }, function thirdAction() {
                        if (filterArr.length > 0) {
                            return connection.batchInsert(`INSERT into asset_winstory_filter_winstory_map values(
                    :FILTER_ASSET_MAP_ID,:FILTER_ID,:WINSTORY_ID)`, filterArr,
                                {
                                    outFormat: oracledb.Object
                                }).then(res => {
                                    console.log("filters inserted successfully")
                                })
                        }
                        else {
                            return connection.query(`SELECT * from asset_winstory_filter_winstory_map`, {})
                        }
                    }
                ], {
                    sequence: true
                })
                    .then(function onTransactionResults(output) {
                        console.log('transaction successful');
                        resolve({ WINSTORY_ID: assetid })
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
            console.log("------------------ SAVEING ASSET -----------------");
            // console.log(JSON.stringify(self));

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
                        filterObj.WINSTORY_ID = assetid;
                        filterArr.push(filterObj)
                        filterObj = {};
                    })
                }
                else if (this.filters.length === 1) {
                    filterObj.FILTER_ASSET_MAP_ID = uniqid.process();
                    filterObj.FILTER_ID = this.filters[0].Value;
                    filterObj.WINSTORY_ID = assetid;
                    filterArr.push(filterObj)
                }
                else {
                    filterArr = null;
                }
                const oj = this.links;
                if (!(oj === null)) {
                    oj.forEach(link => {
                        // linkObj={LINK_ID:uniqid.process(),WINSTORY_ID:assetid,...link}
                        // return linkObj
                        link.LINK_ID = uniqid.process();
                        link.WINSTORY_ID = self.assetId;
                    })
                }

                connection.transaction([
                    function firstAction() {
                        return connection.update(`UPDATE asset_winstory_details set 
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
        ASSET_ARCHITECTURE_DESCRIPTION=:ASSET_ARCHITECTURE_DESCRIPTION
             WHERE WINSTORY_ID=:WINSTORY_ID`,
                            [self.title, self.description, self.usercase, self.customer, self.createdBy,
                            self.scrmId, self.oppId, new Date(), self.modifiedBy, self.expiryDate, self.video_link, self.location, self.owner, 'Pending Review', self.asset_architecture_description, self.assetId],
                            {
                                outFormat: oracledb.Object
                            }).then(res => {
                                console.log('1st update done(Asset details updated)')
                            })
                    }
                    , function secondAction() {
                        if (oj.length > 0) {
                            // console.log("statement:", oj)
                            return connection.execute(`delete from ASSET_LINKS  WHERE WINSTORY_ID=:WINSTORY_ID`, [self.assetId]
                                , {
                                    autoCommit: true
                                }
                            ).then(res => {
                                console.log('2nd update done(Asset links updated)' + res)
                                connection.batchInsert(`INSERT into ASSET_LINKS(LINK_URL_TYPE,LINK_URL,LINK_REPOS_TYPE,LINK_DESCRIPTION,LINK_DESCRIPTION_DATA,DEPLOY_STATUS,LINK_ID,WINSTORY_ID) values(
                                    :LINK_URL_TYPE,:LINK_URL,:LINK_REPOS_TYPE,:LINK_DESCRIPTION,:LINK_DESCRIPTION_DATA,:DEPLOY_STATUS,:LINK_ID,:WINSTORY_ID)`,
                                    oj, {
                                    autoCommit: true
                                })
                            })
                        }
                        else {
                            return connection.query(`SELECT * from asset_links where link_active='true'`, {})
                        }
                    }, function thirdAction() {
                        if (filterArr.length > 0) {
                            //console.log(filterArr)
                            return connection.execute(`delete from asset_winstory_filter_winstory_map WHERE WINSTORY_ID=:WINSTORY_ID`, [self.assetId],
                                {
                                    autocommit: true
                                }
                            ).then(res => {
                                connection.batchInsert(`INSERT into asset_winstory_filter_winstory_map values(
                            :FILTER_ASSET_MAP_ID,:FILTER_ID,:WINSTORY_ID)`, filterArr,
                                    {
                                        outFormat: oracledb.Object
                                    }).then(res => {
                                        console.log("filters inserted successfully")
                                    })
                            })
                        }
                        else {
                            return connection.query(`SELECT * from asset_winstory_filter_winstory_map`, {})
                        }
                    }], {
                    sequence: true
                })
                    .then(function onTransactionResults(output) {
                        console.log('Update transaction successful');
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
                        filterObj.WINSTORY_ID = assetid;
                        filterArr.push(filterObj)
                        filterObj = {};
                    })
                }
                else if (this.filters.length === 1) {
                    filterObj.FILTER_ASSET_MAP_ID = uniqid.process();
                    filterObj.FILTER_ID = this.filters[0].Value;
                    filterObj.WINSTORY_ID = assetid;
                    filterArr.push(filterObj)
                }
                else {
                    filterArr = null;
                }
                let oj = this.links;

                //console.log("MODEL LINK1", oj)
                if (!(oj === null)) {
                    oj.forEach(link => {
                        // linkObj={LINK_ID:uniqid.process(),WINSTORY_ID:assetid,...link}
                        // return linkObj
                        link.LINK_ID = uniqid.process();
                        link.WINSTORY_ID = assetid;
                    })
                }

                //console.log("FilterArr", filterArr)
                //console.log("MODEL LINK2", oj)

                connection.transaction([
                    function firstAction() {
                        return connection.insert(`INSERT into asset_winstory_details(WINSTORY_ID,ASSET_TITLE,ASSET_DESCRIPTION,
                ASSET_USERCASE,ASSET_CUSTOMER,ASSET_CREATEDBY,ASSET_CREATED_DATE,ASSET_SCRM_ID,ASSET_OPP_ID,
                ASSET_THUMBNAIL,ASSET_MODIFIED_DATE,ASSET_MODIFIED_BY,ASSET_VIDEO_URL,ASSET_EXPIRY_DATE,ASSET_VIDEO_LINK,ASSET_LOCATION,ASSET_OWNER,ASSET_STATUS,ASSET_ARCHITECTURE_DESCRIPTION) values(:WINSTORY_ID,:ASSET_TITLE,:ASSET_DESCRIPTION,
                :ASSET_USERCASE,:ASSET_CUSTOMER,:ASSET_CREATEDBY,:CREATED_DATE,:ASSET_SCRM_ID,:ASSET_OPP_ID,
                :ASSET_THUMBNAIL,:ASSET_MODIFIED_DATE,:ASSET_MODIFIED_BY,:ASSET_VIDEO_URL,:ASSET_EXPIRY_DATE,:ASSET_VIDEO_LINK,:ASSET_LOCATION,:ASSET_OWNER,:ASSET_STATUS,:ASSET_ARCHITECTURE_DESCRIPTION)`,
                            [assetid, self.title, self.description, self.usercase, self.customer, self.createdBy,
                                self.createdDate, self.scrmId, self.oppId, self.thumbnail, self.modifiedDate, self.modifiedBy, self.ASSET_VIDEO_URL, self.expiryDate, self.video_link, self.location, self.owner, 'Pending Review', self.asset_architecture_description],
                            {
                                outFormat: oracledb.Object
                            }).then(res => {
                                console.log('1st insert done(Asset details inserted)')
                            })
                    }
                    , function secondAction() {
                        if (oj.length > 0) {
                            return connection.batchInsert(`INSERT into ASSET_LINKS(LINK_URL_TYPE,LINK_URL,LINK_REPOS_TYPE,LINK_DESCRIPTION,LINK_DESCRIPTION_DATA,DEPLOY_STATUS,LINK_ID,WINSTORY_ID) values(
                :LINK_URL_TYPE,:LINK_URL,:LINK_REPOS_TYPE,:LINK_DESCRIPTION,:LINK_DESCRIPTION_DATA,:DEPLOY_STATUS,:LINK_ID,:WINSTORY_ID)`,
                                oj, {
                                autocommit: true
                            }
                            )
                        }
                        else {
                            //console.log("oj is empty")
                            return connection.query(`SELECT * from asset_links where link_active='true'`, {})
                        }
                    }, function thirdAction() {
                        if (filterArr.length > 0) {
                            return connection.batchInsert(`INSERT into asset_winstory_filter_winstory_map values(
                    :FILTER_ASSET_MAP_ID,:FILTER_ID,:WINSTORY_ID)`, filterArr,
                                {
                                    outFormat: oracledb.Object
                                }).then(res => {
                                    console.log("filters inserted successfully")
                                })
                        }
                        else {
                            return connection.query(`SELECT * from asset_winstory_filter_winstory_map`, {})
                        }
                    }
                ], {
                    sequence: true
                })
                    .then(function onTransactionResults(output) {
                        console.log('transaction successful');
                        resolve({ WINSTORY_ID: assetid })
                    })
                    .catch(err => {
                        console.log(err)
                    })

            }
        })
    }


    static uploadImages(assetId, images, imageDescription) {
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
            connection.batchInsert(`INSERT INTO ASSET_IMAGES values(:IMAGE_ID,:WINSTORY_ID,:IMAGE_NAME,:IMAGEURL,:IMAGE_DESCRIPTION)`,
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



    static uploadThumbnail(assetId, thumbnail) {
        return new Promise((resolve, reject) => {
            //console.log("inside thumnnail function")
            const connection = getDb();
            let fname = thumbnail.name.split('.')[0];
            fname = fname.replace(/ /g, '');

            const ftype = thumbnail.name.split('.')[1];
            const uniqueId = uniqid();
            const finalFname = fname + uniqueId.concat('.', ftype);
            //console.log(finalFname)
            const uploadPath = path.join(__dirname, '../../../..', 'mnt/ahfs', finalFname);
            var content = `http://129.213.72.248:8001/${finalFname}`
            //console.log(content)
            thumbnail.mv(uploadPath, function (err) {
                if (err) {
                    return res.status(500).send(err);
                }
            })
            connection.update(`UPDATE asset_winstory_details set 
            ASSET_THUMBNAIL=:ASSET_THUMBNAIL
             WHERE WINSTORY_ID=:WINSTORY_ID`, [content, assetId],
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

    static uploadVideo(assetId, video) {
        return new Promise((resolve, reject) => {
            //console.log("inside video function")
            const connection = getDb();
            let fname = video.name.split('.')[0];
            fname = fname.replace(/ /g, '');

            const ftype = video.name.split('.')[1];
            const uniqueId = uniqid();
            const finalFname = fname + uniqueId.concat('.', ftype);
            const uploadPath = path.join(__dirname, '../public/', finalFname);
            var content = `http://129.213.72.248:8001/${finalFname}`
            video.mv(uploadPath, function (err) {
                if (err) {
                    return res.status(500).send(err);
                }
            })
            connection.update(`UPDATE asset_winstory_details set 
        ASSET_VIDEO_URL=:ASSET_VIDEO_URL
             WHERE WINSTORY_ID=:WINSTORY_ID`, [content, assetId],
                {
                    outFormat: oracledb.Object,
                    autoCommit: true
                }).then(res => {
                    //console.log("video inserted Successfully")
                    resolve("working")
                })
        })
    }


    static uploadCommentByAssetId(assetid, comment, commentBy, commentId, commentByUserName) {
        let action;
        let sql;
        let options;
        return new Promise((resolve, reject) => {
            if (!commentId) {
                action = "inserted"
                sql = `INSERT into ASSET_COMMENTS values(:COMMENT_ID,:COMMENT_COMMENT,:COMMENTBY,:COMMENTON,:WINSTORY_ID,:COMMENT_USERNAME)`;
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
                    resolve({ status: "comment " + action + " successfully" })
                })
                .catch(err => {
                    //console.log(err)
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
                sql = `INSERT into ASSET_LIKES values(:LIKE_ID,:WINSTORY_ID,:LIKE_BY,:LIKE_CREATED,:LIKE_USERNAME)`;
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
                sql = `INSERT into ASSET_LIKES values(:LIKE_ID,:WINSTORY_ID,:LIKE_BY,:LIKE_CREATED,:LIKE_USERNAME)`;
                options = [likeIdGenerated, assetid, likeBy, new Date(), like_by_username]
            }
            else {
                //console.log("in like unlike section")
                sql = `DELETE from ASSET_LIKES WHERE  LIKE_BY=:LIKE_BY and WINSTORY_ID=:WINSTORY_ID`;
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
                    //console.log(err)
                })
        })

    }


    static addViewByAssetId(assetId, viewedBy, viewed_by_username, viewed_on) {
        return new Promise((resolve, reject) => {
            let sql = `INSERT into ASSET_VIEWS values(:VIEW_ID,:WINSTORY_ID,:VIEWED_BY,:VIEW_CREATED_ON,:VIEWED_BY_USERNAME,:CLIENT_PLATFORM)`;
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
                    //console.log(err)
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
            connection.execute(`DELETE from ASSET_IMAGES WHERE WINSTORY_ID=:WINSTORY_ID`, [assetId],
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
            connection.execute(`DELETE from ASSET_LINKS WHERE LINK_ID=:LINK_ID and WINSTORY_ID=:WINSTORY_ID`, [linkId, assetId],
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
            connection.execute(`DELETE from asset_winstory_details WHERE WINSTORY_ID=:WINSTORY_ID`, [assetId],
                {
                    autoCommit: true,
                    outFormat: oracledb.Object
                })
                .then(res => {
                    connection.execute(`DELETE from ASSET_IMAGES WHERE WINSTORY_ID=:WINSTORY_ID`, [assetId],
                        {
                            autoCommit: true,
                            outFormat: oracledb.Object
                        })
                        .then(res => {
                            connection.execute(`DELETE from ASSET_LINKS WHERE WINSTORY_ID=:WINSTORY_ID`, [assetId],
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
            connection.execute(`DELETE from ASSET_LINKS WHERE WINSTORY_ID=:WINSTORY_ID`, [assetId],
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


                let combineContentToMatch = data[i].WINSTORY_NAME +
                    data[i].WINSTORY_PARTNER +
                    data[i].WINSTORY_CUSTOMER_NAME +
                    data[i].WINSTORY_IMPERATIVE +
                    data[i].WINSTORY_CUSTOMER_IMPACT +
                    data[i].WINSTORY_BUSSINESS_DRIVER +
                    data[i].WINSTORY_SALES_PROCESS +
                    data[i].WINSTORY_USECASE +
                    data[i].WINSTORY_LESSON_LEARNT +
                    data[i].WINSTORY_SOLUTION_USECASE +
                    data[i].WINSTORY_COMPETIION +
                    data[i].WINSTORY_MAPPED_L2_FILTERS;

                assetFilters = filterdata
                    .filter(filter => data[i].WINSTORY_ID === filter.WINSTORY_ID)
                    .map((filter) => {
                        combineContentToMatch += filter.FILTER_NAME + filter.FILTER_TYPE;
                    });

                // searchString = searchString.replace(/ /g, "");
                let wordlist = searchString.split(/ |,/);
                // console.log("----- WIN  WORD SPLIT ------")
                console.log(JSON.stringify("Captured Words ==== > " + wordlist));


                combineContentToMatch = combineContentToMatch.toLowerCase();
                wordlist.forEach(word => {
                    if (word.includes("+")) {
                        let isMatch = true;
                        let wordfrag = word.split("+");
                        for (let i = 0; i < wordfrag.length; i++) {
                            if (combineContentToMatch.indexOf(wordfrag[i].toLowerCase()) == -1) {
                                isMatch = false;
                                break;
                            }
                            if (isMatch) {
                                filtersasset.push(data[i]);
                            }
                        }
                    } else if (combineContentToMatch.indexOf(word.toLowerCase()) != -1) {// MATCH FOUND
                        filtersasset.push(data[i]);
                    }
                })
            }
            console.log(data.length + " > Filtered By Search : " + filtersasset.length);
            resolve(true);
        })
    }


    static fetchAssets2(host, offset, limit, filters, searchString, sortBy, order, action) {
        //console.log(JSON.stringify(filters));
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
                        this.convertsql2(data).then(query => {
                            const connection = getDb();
                            connection.query(query, {},
                                {
                                    outFormat: oracledb.OBJECT
                                }).then(data => {
                                    // WE ARE THE GETTING THE FILTERED ASSETS BASED ON SELECTION


                                    let fetchAllFilterSQL = `select a.filter_id,a.filter_name,a.filter_type,b.winstory_id from asset_filter a, ASSET_WINSTORY_FILTER_WINSTORY_MAP b where a.filter_id=b.filter_id and a.filter_status=1`;

                                    connection.query(fetchAllFilterSQL, {},
                                        {
                                            outFormat: oracledb.OBJECT
                                        }).then(filterdata => {
                                            let filtersasset = [];
                                            this.filterAssetBySearchString(data, filterdata, searchString, filtersasset).then(res => {
                                                //console.log("Content filter ended : " + filtersasset.length);
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
                let query = "SELECT * FROM ASSET_WINSTORY_DETAILS WHERE WINSTORY_STATUS='Live'";
                connection.query(query, {},
                    {
                        outFormat: oracledb.OBJECT
                    }).then(data => {
                        // WE ARE THE GETTING THE FILTERED ASSETS BASED ON SELECTION
                        let fetchAllFilterSQL = `select a.filter_id,a.filter_name,a.filter_type,b.winstory_id from asset_filter a, ASSET_WINSTORY_FILTER_WINSTORY_MAP b where a.filter_id=b.filter_id and a.filter_status=1`;

                        connection.query(fetchAllFilterSQL, {},
                            {
                                outFormat: oracledb.OBJECT
                            }).then(filterdata => {
                                let filtersasset = [];
                                this.filterAssetBySearchString(data, filterdata, searchString, filtersasset).then(res => {
                                    //console.log("Content filter ended : " + filtersasset.length);
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

        // REMOVE DUPLICATE ENTRIES
        let assetidtracker = {};
        let uniqueassetarray = assetsArray.filter(asset => {
            if (!assetidtracker[asset.WINSTORY_ID]) {
                assetidtracker[asset.WINSTORY_ID] = 1;
                return asset;
            }
        })
        assetsArray = uniqueassetarray;

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

            const connection = getDb();
            connection.execute(`SELECT * from ASSET_WINSTORY_LINKS  where link_active='true'`, {},
                {
                    outFormat: oracledb.OBJECT
                },
            ).then(res => {
                linksArray = res.rows;
                connection.query(`select Count(*) comment_count,WINSTORY_ID from 
    asset_winstory_comments group by WINSTORY_ID`, [],
                    {
                        outFormat: oracledb.OBJECT
                    })
                    .then(res => {
                        commentsArray = res;
                        connection.query(`select avg(rate) avg_rating,WINSTORY_ID from asset_winstory_rates group by WINSTORY_ID`, [],
                            {
                                outFormat: oracledb.OBJECT
                            }).then(res => {
                                ratingsArray = res;
                                connection.execute(`SELECT * from ASSET_IMAGES`, {},
                                    {
                                        outFormat: oracledb.OBJECT
                                    })
                                    .then(res => {
                                        imagesArray = res.rows;
                                        connection.execute(`select m.filter_id,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Solution Area'`, {},
                                            {
                                                outFormat: oracledb.OBJECT
                                            })
                                            .then(res => {
                                                solutionAreasArray = res.rows;
                                                connection.execute(`select m.filter_id,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Asset Type'`, {},
                                                    {
                                                        outFormat: oracledb.OBJECT
                                                    })
                                                    .then(res => {
                                                        assetTypesArray = res.rows;
                                                        connection.execute(`select m.filter_id,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Sales Play'`, {},
                                                            {
                                                                outFormat: oracledb.OBJECT
                                                            })
                                                            .then(res => {
                                                                salesPlaysArray = res.rows;
                                                                connection.execute(`select m.filter_id,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Industry'`, {},
                                                                    {
                                                                        outFormat: oracledb.OBJECT
                                                                    })
                                                                    .then(res => {
                                                                        industryArray = res.rows;
                                                                        connection.execute(`SELECT count(*) like_count,WINSTORY_ID from ASSET_WINSTORY_LIKES group by WINSTORY_ID`, [],
                                                                            {
                                                                                outFormat: oracledb.OBJECT
                                                                            })
                                                                            .then(res => {
                                                                                likesArray = res.rows;
                                                                                connection.execute(`SELECT count(*) view_count,WINSTORY_ID from ASSET_WINSTORY_VIEWS group by WINSTORY_ID`, [],
                                                                                    {
                                                                                        outFormat: oracledb.OBJECT
                                                                                    })
                                                                                    .then(res => {
                                                                                        viewsArray = res.rows;
                                                                                        connection.execute(`SELECT WINSTORY_ID from ASSET_WINSTORY_LOB_LEADER_PROMOTED_WINSTORY where status=1`, [],
                                                                                            {
                                                                                                outFormat: oracledb.OBJECT
                                                                                            })
                                                                                            .then(res => {
                                                                                                promotedArray = res.rows;
                                                                                                connection.execute(`select m.filter_id,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Win Status'`, {},
                                                                                                    {
                                                                                                        outFormat: oracledb.OBJECT
                                                                                                    })
                                                                                                    .then(res => {
                                                                                                        let winStatusArray = res.rows;
                                                                                                        //console.log(viewsArray);
                                                                                                        assetsArray.forEach(asset => {
                                                                                                            const id = asset.WINSTORY_ID;

                                                                                                            allAssetsObj = asset;
                                                                                                            allAssetsObj.createdDate = allAssetsObj.WINSTORY_CREATED_ON;
                                                                                                            let path = allAssetsObj.WINSTORY_THUMBNAIL;
                                                                                                            if (path == null) {
                                                                                                                allAssetsObj.WINSTORY_THUMBNAIL = `http://${host}/winstorylogo/Logo_Thumbnail.png`
                                                                                                            } else
                                                                                                                allAssetsObj.WINSTORY_THUMBNAIL = `http://${host}/${path}`;

                                                                                                            let logopath = allAssetsObj.WINSTORY_LOGO;
                                                                                                            if (logopath == null) {
                                                                                                                allAssetsObj.WINSTORY_LOGO = `http://${host}/winstorylogo/Logo_Thumbnail.png`
                                                                                                            } else
                                                                                                                allAssetsObj.WINSTORY_LOGO = `http://${host}/${logopath}`;

                                                                                                            allAssetsObj.LINKS = [];
                                                                                                            var links = linksArray.filter(link => link.WINSTORY_ID == id)

                                                                                                            solutionAreas = solutionAreasArray.filter(s => s.WINSTORY_ID == id);
                                                                                                            assetTypes = assetTypesArray.filter(s => s.WINSTORY_ID == id);
                                                                                                            salesPlays = salesPlaysArray.filter(s => s.WINSTORY_ID == id);
                                                                                                            industry = industryArray.filter(s => s.WINSTORY_ID == id);
                                                                                                            let winStatus = winStatusArray.filter(s => s.WINSTORY_ID == id);
                                                                                                            //console.log(solutionAreas);
                                                                                                            allAssetsObj.WIN_STATUS = winStatus
                                                                                                            allAssetsObj.SOLUTION_AREAS = solutionAreas
                                                                                                            allAssetsObj.ASSET_TYPE = assetTypes;
                                                                                                            allAssetsObj.SALES_PLAY = salesPlays;
                                                                                                            allAssetsObj.INDUSTRY = industry;
                                                                                                            linkType = links.map(a => a.LINK_REPOS_TYPE)
                                                                                                            linkType = [...new Set(linkType)]
                                                                                                            let promote = promotedArray.filter(s => s.WINSTORY_ID === id);
                                                                                                            allAssetsObj.PROMOTE = promote.length == 0 ? false : true;
                                                                                                            linkType.forEach(type => {
                                                                                                                var links2 = linksArray.filter(link => link.LINK_REPOS_TYPE === type && link.WINSTORY_ID === id)
                                                                                                                lobj.TYPE = type;
                                                                                                                lobj.arr = links2;
                                                                                                                lobj2 = lobj
                                                                                                                linkObjArr.push(lobj2);
                                                                                                                lobj = {}
                                                                                                            })
                                                                                                            allAssetsObj.LINKS = linkObjArr;

                                                                                                            linkObjArr = [];
                                                                                                            ////console.log(lobj2,"obj2")
                                                                                                            var images = imagesArray.filter(image => image.WINSTORY_ID === id);
                                                                                                            allAssetsObj.IMAGES = images;
                                                                                                            var comments = commentsArray.filter(c => c.WINSTORY_ID === id);

                                                                                                            var ratings = ratingsArray.filter(r => r.WINSTORY_ID === id)
                                                                                                            var likes = likesArray.filter(l => l.WINSTORY_ID === id)
                                                                                                            var views = viewsArray.filter(v => v.WINSTORY_ID === id)
                                                                                                            if (comments[0]) {
                                                                                                                delete comments[0].WINSTORY_ID;

                                                                                                            }
                                                                                                            if (!comments.length) {
                                                                                                                comments.push({ COMMENT_COUNT: 0 });
                                                                                                            }
                                                                                                            if (!ratings.length) {
                                                                                                                ratings.push({ AVG_RATING: 0, WINSTORY_ID: id })
                                                                                                            }
                                                                                                            if (!likes.length) {
                                                                                                                likes.push({ LIKE_COUNT: 0, WINSTORY_ID: id })
                                                                                                            }
                                                                                                            if (!views.length) {
                                                                                                                views.push({ VIEW_COUNT: 0, WINSTORY_ID: id })
                                                                                                            }

                                                                                                            allAssetsObj.COMMENTS = comments[0];
                                                                                                            allAssetsObj.RATINGS = ratings[0];
                                                                                                            allAssetsObj.LIKES = likes[0];
                                                                                                            allAssetsObj.VIEWS = views[0];
                                                                                                            if (!(sortBy == 'views' && allAssetsObj.VIEWS.VIEW_COUNT == 0)) {
                                                                                                                allAssets.push(allAssetsObj);
                                                                                                            }

                                                                                                        })

                                                                                                        let allObj = {};
                                                                                                        allObj.TOTALCOUNT = allAssets.length;
                                                                                                        tAssets = allAssets;
                                                                                                        dynamicSort(tAssets, sortBy, order);
                                                                                                        var tmp = tAssets.slice(offset, limit)
                                                                                                        allObj.WINSTORIES = tmp;
                                                                                                        resolve(allObj);

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

    // CREATE QUERY STRING BASED ON SELECTED FILTERS
    static convertsql2(data) {
        console.log("----------  Converting 2 SQL WIN -------------");

        let filterTypeMap = {};
        let queryString = "";

        let reducedFilter = data.filter(filter => {
            if (filter.FILTER_ID.indexOf("14983ddhswcdol") == -1 && filter.FILTER_ID.indexOf("Gdjfdskyuetr472V") == -1) {
                return filter;
            }
        })

        data = reducedFilter;

        return new Promise((resolve, reject) => {
            // CREATE SQL queries   
            if (data.length > 0) {
                data.forEach(val => {
                    if (val.FILTER_TYPE != "Asset Type") {
                        let filterstring = filterTypeMap[val.FILTER_TYPE] != undefined ? filterTypeMap[val.FILTER_TYPE] + " INTERSECT select c.WINSTORY_ID from ASSET_WINSTORY_FILTER_WINSTORY_MAP c,asset_filter d where " : "select c.WINSTORY_ID from ASSET_WINSTORY_FILTER_WINSTORY_MAP c,asset_filter d where ";
                        filterTypeMap[val.FILTER_TYPE] = filterstring + " d.filter_id='" + val.FILTER_ID + "' and c.filter_id=d.filter_id and  d.filter_type!='Asset Type'";
                    }
                });
                Object.keys(filterTypeMap).forEach(filterType => {
                    queryString = queryString.length > 0 ? queryString + ") union (" + filterTypeMap[filterType] : filterTypeMap[filterType];
                })

                queryString = "select b.* from  ((" + queryString + ")) a,ASSET_WINSTORY_DETAILS b where a.WINSTORY_ID=b.WINSTORY_ID and b.WINSTORY_STATUS='Live'";

            } else {
                queryString = "select b.* from  (select distinct WINSTORY_ID from ASSET_WINSTORY_FILTER_WINSTORY_MAP c,asset_filter d where c.filter_id=d.filter_id and  d.filter_type='Asset Type') a,ASSET_WINSTORY_DETAILS b where a.WINSTORY_ID=b.WINSTORY_ID and b.WINSTORY_STATUS='Live'";

            }

            console.log(queryString);
            // RETURN THE GENERATED QUERY 
            resolve(queryString);
        })
    }

    // CREATE QUERY STRING BASED ON SELECTED FILTERS
    static convertsql(data) {
        console.log("----------  Converting SQL WIN -------------");
        // console.log(JSON.stringify(data));

        let filterTypeMap = {};
        let queryString = "";

        let reducedFilter = data.filter(filter => filter.FILTER_TYPE != "Asset Type");

        data = reducedFilter;

        return new Promise((resolve, reject) => {
            // CREATE SQL queries   
            if (data.length > 0) {
                data.forEach(val => {
                    if (val.FILTER_TYPE != "Asset Type") {
                        let filterstring = filterTypeMap[val.FILTER_TYPE] != undefined ? filterTypeMap[val.FILTER_TYPE] + " and " : "select c.WINSTORY_ID from ASSET_WINSTORY_FILTER_WINSTORY_MAP c,asset_filter d where ";
                        filterTypeMap[val.FILTER_TYPE] = filterstring + " d.filter_id='" + val.FILTER_ID + "'";
                    }
                });


                Object.keys(filterTypeMap).forEach(filterType => {
                    queryString = queryString.length > 0 ? queryString + " and c.filter_id=d.filter_id and  d.filter_type!='Asset Type' union " + filterTypeMap[filterType] : filterTypeMap[filterType];
                })

                queryString = "select b.* from  (" + queryString + " and c.filter_id=d.filter_id and  d.filter_type!='Asset Type') a,ASSET_WINSTORY_DETAILS b where a.WINSTORY_ID=b.WINSTORY_ID and b.WINSTORY_STATUS='Live'";

            } else {
                queryString = "select b.* from  (select distinct WINSTORY_ID from ASSET_WINSTORY_FILTER_WINSTORY_MAP c,asset_filter d where c.filter_id=d.filter_id and  d.filter_type='Asset Type') a,ASSET_WINSTORY_DETAILS b where a.WINSTORY_ID=b.WINSTORY_ID and b.WINSTORY_STATUS='Live'";

            }

            console.log(queryString);
            // RETURN THE GENERATED QUERY 
            resolve(queryString);
        })
    }

    static fetchPreferedWins(host, userEmail) {
        let finalList = [];
        const offset = 0
        let limit;
        let order;
        let sortBy;

        const connection = getDb();
        return new Promise((resolve, reject) => {

            // GET THE PREFERED FILTERS
            let fetchPreferedFilterSql = "select ASSET_FILTER_ID from asset_preferences where USER_EMAIL='" + userEmail + "'";
            connection.query(fetchPreferedFilterSql, {},
                {
                    outFormat: oracledb.OBJECT
                },
            ).then(filterList => {
                let filterids = filterList.map(filter => filter.ASSET_FILTER_ID).join().replace(/,/g, "','");
                console.log(JSON.stringify(filterids));

                // GET THE MAPPED ASSES FOR THE FILTERS
                let fetchAssetsSql = `select b.* from ASSET_WINSTORY_FILTER_WINSTORY_MAP a, ASSET_WINSTORY_DETAILS b 
                where a.filter_id in('`+ filterids + `') 
                and a.WINSTORY_ID=b.WINSTORY_ID 
                and b.winstory_status='Live'`;
                console.log("> " + fetchAssetsSql);
                connection.query(fetchAssetsSql, {},
                    {
                        outFormat: oracledb.OBJECT
                    },
                ).then(winList => {
                    // console.log(JSON.stringify(assetlist));
                    finalList = [...winList];

                    let fetchtopwordssql = `select activity_filter, count(*) as frequency from asset_search_activity 
                    where activity_type='FREETEXT' 
                    and activity_performed_by='` + userEmail + `' 
                    group by activity_filter 
                    order by frequency desc 
                    FETCH NEXT 3 ROWS ONLY`
                    connection.query(fetchtopwordssql, {},
                        {
                            outFormat: oracledb.OBJECT
                        },
                    ).then(words => {
                        let fetchtopwordssql = `select * from asset_winstory_details where winstory_status='Live'`;
                        connection.query(fetchtopwordssql, {},
                            {
                                outFormat: oracledb.OBJECT
                            },
                        ).then(allwins => {
                            console.log(JSON.stringify(words));
                            let wordlist = words.map(word => word.ACTIVITY_FILTER);


                            for (let i = 0; i < allwins.length; i++) {
                                let combineContentToMatch = allwins[i].WINSTORY_NAME +
                                    allwins[i].WINSTORY_PARTNER +
                                    allwins[i].WINSTORY_CUSTOMER_NAME +
                                    allwins[i].WINSTORY_IMPERATIVE +
                                    allwins[i].WINSTORY_CUSTOMER_IMPACT +
                                    allwins[i].WINSTORY_BUSSINESS_DRIVER +
                                    allwins[i].WINSTORY_SALES_PROCESS +
                                    allwins[i].WINSTORY_USECASE +
                                    allwins[i].WINSTORY_LESSON_LEARNT +
                                    allwins[i].WINSTORY_SOLUTION_USECASE +
                                    allwins[i].WINSTORY_COMPETIION +
                                    allwins[i].WINSTORY_MAPPED_L2_FILTERS;

                                combineContentToMatch = combineContentToMatch.toLowerCase();
                                wordlist.forEach(word => {
                                    // console.log(" >>> " + combineContentToMatch.indexOf(word));
                                    if (combineContentToMatch.indexOf(word) != -1) {// MATCH FOUND
                                        finalList.push(allwins[i]);
                                    }
                                })
                            }
                            console.log("Suggested wins : " + finalList.length);
                            this.refineAssets(host, offset, limit, finalList, sortBy, order, "").then(assets => {
                                resolve(assets);
                            })
                        })

                    })
                })

            })

        })

    }


    //Fetch asset model function
    static fetchAssets(host, offset, limit, filters, searchString2, sortBy, order, action) {
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
                //console.log('FILTER Search start');
                // select * from asset_details where asset_status='Live' and asset_id in(
                //     select  d.asset_id from asset_details d join asset_filter_asset_map m on 
                //     (d.asset_id=m.asset_id) where m.filter_id in (SELECT * FROM ASSET_FILTER WHERE lower(FILTER_NAME) LIKE '%${searchString2}%'))
                sql = `select * from asset_winstory_details where WINSTORY_STATUS='Live' and WINSTORY_ID in(
                    select  d.WINSTORY_ID from asset_winstory_details d join asset_winstory_filter_winstory_map m on 
                    (d.WINSTORY_ID=m.WINSTORY_ID) where m.filter_id in (SELECT filter_id FROM ASSET_FILTER WHERE lower(FILTER_NAME) LIKE '%${searchString}%') UNION select WINSTORY_ID from asset_winstory_details where (lower(WINSTORY_NAME) LIKE '%${searchString}%' or lower(WINSTORY_USECASE) LIKE '%${searchString}%'))`;
                options = {
                }
                //console.log(sql);
            } else if (filters[0]) {
                var filterArr = [];
                filterArr = filters[0].split(',')
                var filter = filters.toString();
                const l = filterArr.length;
                if (action === 'preferenceApi') {
                    //console.log("PAPI HIT")
                    sql = `select * from asset_winstory_details where WINSTORY_STATUS='Live' and WINSTORY_ID in (
            select  distinct WINSTORY_ID from asset_winstory_filter_winstory_map 
            where filter_id in (select regexp_substr(:BIND,'[^,]+', 1, level)
            from dual 
            connect by regexp_substr(:BIND, '[^,]+', 1, level) is not null ))`;
                    options = {
                        BIND: filter

                    }

                }
                else {
                    sql = `select * from asset_winstory_details where WINSTORY_STATUS='Live' and WINSTORY_ID in(
                select  d.WINSTORY_ID from asset_winstory_details d join asset_winstory_filter_winstory_map m on 
                (d.WINSTORY_ID=m.WINSTORY_ID) where m.filter_id in (select regexp_substr(:BIND,'[^,]+', 1, level)
                from dual 
                connect by regexp_substr(:BIND, '[^,]+', 1, level) is not null ) 
                group by d.WINSTORY_ID having count(distinct(m.filter_id))=:COUNT)`;
                    options = {
                        BIND: filter,
                        COUNT: l
                    }
                }
            }
            else {
                sql = `select * from asset_winstory_details where WINSTORY_STATUS='Live'`;
                options = {

                }
            }

            try {
                connection.query(sql, options,
                    {
                        outFormat: oracledb.OBJECT
                    })
                    .then(res => {
                        assetsArray = res
                        connection.execute(`SELECT * from ASSET_WINSTORY_LINKS  where link_active='true'`, {},
                            {
                                outFormat: oracledb.OBJECT
                            },
                        ).then(res => {
                            linksArray = res.rows;
                            connection.query(`select Count(*) comment_count,WINSTORY_ID from 
                asset_winstory_comments group by WINSTORY_ID`, [],
                                {
                                    outFormat: oracledb.OBJECT
                                })
                                .then(res => {
                                    commentsArray = res;
                                    connection.query(`select avg(rate) avg_rating,WINSTORY_ID from asset_winstory_rates group by WINSTORY_ID`, [],
                                        {
                                            outFormat: oracledb.OBJECT
                                        }).then(res => {
                                            ratingsArray = res;
                                            connection.execute(`SELECT * from ASSET_IMAGES`, {},
                                                {
                                                    outFormat: oracledb.OBJECT
                                                })
                                                .then(res => {
                                                    imagesArray = res.rows;
                                                    connection.execute(`select m.filter_id,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Solution Area'`, {},
                                                        {
                                                            outFormat: oracledb.OBJECT
                                                        })
                                                        .then(res => {
                                                            solutionAreasArray = res.rows;
                                                            connection.execute(`select m.filter_id,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Asset Type'`, {},
                                                                {
                                                                    outFormat: oracledb.OBJECT
                                                                })
                                                                .then(res => {
                                                                    assetTypesArray = res.rows;
                                                                    connection.execute(`select m.filter_id,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Sales Play'`, {},
                                                                        {
                                                                            outFormat: oracledb.OBJECT
                                                                        })
                                                                        .then(res => {
                                                                            salesPlaysArray = res.rows;
                                                                            connection.execute(`select m.filter_id,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Industry'`, {},
                                                                                {
                                                                                    outFormat: oracledb.OBJECT
                                                                                })
                                                                                .then(res => {
                                                                                    industryArray = res.rows;
                                                                                    connection.execute(`select m.filter_id,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Win Status'`, {},
                                                                                        {
                                                                                            outFormat: oracledb.OBJECT
                                                                                        })
                                                                                        .then(res => {
                                                                                            let winStatusArray = res.rows;
                                                                                            connection.execute(`SELECT count(*) like_count,WINSTORY_ID from ASSET_WINSTORY_LIKES group by WINSTORY_ID`, [],
                                                                                                {
                                                                                                    outFormat: oracledb.OBJECT
                                                                                                })
                                                                                                .then(res => {
                                                                                                    likesArray = res.rows;
                                                                                                    connection.execute(`SELECT count(*) view_count,WINSTORY_ID from ASSET_WINSTORY_VIEWS group by WINSTORY_ID`, [],
                                                                                                        {
                                                                                                            outFormat: oracledb.OBJECT
                                                                                                        })
                                                                                                        .then(res => {
                                                                                                            viewsArray = res.rows;
                                                                                                            connection.execute(`SELECT WINSTORY_ID from ASSET_WINSTORY_LOB_LEADER_PROMOTED_WINSTORY where status=1`, [],
                                                                                                                {
                                                                                                                    outFormat: oracledb.OBJECT
                                                                                                                })
                                                                                                                .then(res => {
                                                                                                                    promotedArray = res.rows;
                                                                                                                    //console.log(viewsArray);
                                                                                                                    assetsArray.forEach(asset => {
                                                                                                                        const id = asset.WINSTORY_ID;

                                                                                                                        allAssetsObj = asset;
                                                                                                                        allAssetsObj.createdDate = allAssetsObj.WINSTORY_CREATED_ON;
                                                                                                                        let path = allAssetsObj.WINSTORY_THUMBNAIL;
                                                                                                                        if (path == null) {
                                                                                                                            allAssetsObj.WINSTORY_THUMBNAIL = `http://${host}/winstorylogo/Logo_Thumbnail.png`
                                                                                                                        } else
                                                                                                                            allAssetsObj.WINSTORY_THUMBNAIL = `http://${host}/${path}`;

                                                                                                                        let logopath = allAssetsObj.WINSTORY_LOGO;
                                                                                                                        if (logopath == null) {
                                                                                                                            allAssetsObj.WINSTORY_LOGO = `http://${host}/winstorylogo/Logo_Thumbnail.png`
                                                                                                                        } else
                                                                                                                            allAssetsObj.WINSTORY_LOGO = `http://${host}/${logopath}`;

                                                                                                                        allAssetsObj.LINKS = [];
                                                                                                                        var links = linksArray.filter(link => link.WINSTORY_ID == id)
                                                                                                                        //console.log(id + ' :links:', links);
                                                                                                                        //console.log(id + ' :solutionAreas:', solutionAreasArray);
                                                                                                                        solutionAreas = solutionAreasArray.filter(s => s.WINSTORY_ID == id);
                                                                                                                        assetTypes = assetTypesArray.filter(s => s.WINSTORY_ID == id);
                                                                                                                        salesPlays = salesPlaysArray.filter(s => s.WINSTORY_ID == id);
                                                                                                                        industry = industryArray.filter(s => s.WINSTORY_ID == id);
                                                                                                                        let winStatus = winStatusArray.filter(s => s.WINSTORY_ID == id);
                                                                                                                        allAssetsObj.WIN_STATUS = winStatus
                                                                                                                        allAssetsObj.SOLUTION_AREAS = solutionAreas
                                                                                                                        allAssetsObj.ASSET_TYPE = assetTypes;
                                                                                                                        allAssetsObj.SALES_PLAY = salesPlays;
                                                                                                                        allAssetsObj.INDUSTRY = industry;
                                                                                                                        linkType = links.map(a => a.LINK_REPOS_TYPE)
                                                                                                                        linkType = [...new Set(linkType)]
                                                                                                                        let promote = promotedArray.filter(s => s.WINSTORY_ID === id);
                                                                                                                        allAssetsObj.PROMOTE = promote.length == 0 ? false : true;
                                                                                                                        linkType.forEach(type => {
                                                                                                                            var links2 = linksArray.filter(link => link.LINK_REPOS_TYPE === type && link.WINSTORY_ID === id)
                                                                                                                            lobj.TYPE = type;
                                                                                                                            lobj.arr = links2;
                                                                                                                            lobj2 = lobj
                                                                                                                            linkObjArr.push(lobj2);
                                                                                                                            lobj = {}
                                                                                                                        })
                                                                                                                        allAssetsObj.LINKS = linkObjArr;

                                                                                                                        linkObjArr = [];
                                                                                                                        ////console.log(lobj2,"obj2")
                                                                                                                        var images = imagesArray.filter(image => image.WINSTORY_ID === id);
                                                                                                                        allAssetsObj.IMAGES = images;
                                                                                                                        var comments = commentsArray.filter(c => c.WINSTORY_ID === id);

                                                                                                                        var ratings = ratingsArray.filter(r => r.WINSTORY_ID === id)
                                                                                                                        var likes = likesArray.filter(l => l.WINSTORY_ID === id)
                                                                                                                        var views = viewsArray.filter(v => v.WINSTORY_ID === id)
                                                                                                                        if (comments[0]) {
                                                                                                                            delete comments[0].WINSTORY_ID;

                                                                                                                        }
                                                                                                                        if (!comments.length) {
                                                                                                                            comments.push({ COMMENT_COUNT: 0 });
                                                                                                                        }
                                                                                                                        if (!ratings.length) {
                                                                                                                            ratings.push({ AVG_RATING: 0, WINSTORY_ID: id })
                                                                                                                        }
                                                                                                                        if (!likes.length) {
                                                                                                                            likes.push({ LIKE_COUNT: 0, WINSTORY_ID: id })
                                                                                                                        }
                                                                                                                        if (!views.length) {
                                                                                                                            views.push({ VIEW_COUNT: 0, WINSTORY_ID: id })
                                                                                                                        }
                                                                                                                        //console.log("Comments Array",comments)
                                                                                                                        //console.log("Likes Array",likes)
                                                                                                                        allAssetsObj.COMMENTS = comments[0];
                                                                                                                        allAssetsObj.RATINGS = ratings[0];
                                                                                                                        allAssetsObj.LIKES = likes[0];
                                                                                                                        allAssetsObj.VIEWS = views[0];
                                                                                                                        if (!(sortBy == 'views' && allAssetsObj.VIEWS.VIEW_COUNT == 0)) {
                                                                                                                            allAssets.push(allAssetsObj);
                                                                                                                        }
                                                                                                                        //allAssets.push(allAssetsObj)

                                                                                                                    })
                                                                                                                    // if (searchString2) {
                                                                                                                    //     let allObj = {};
                                                                                                                    //     const filteredAssets = allAssets.filter(asset => {
                                                                                                                    //         if (asset.WINSTORY_CUSTOMER_NAME) {
                                                                                                                    //             return (asset.WINSTORY_NAME.toLowerCase().includes(searchString2.toLowerCase()) || asset.WINSTORY_USECASE.toLowerCase().includes(searchString2.toLowerCase()) || asset.WINSTORY_ID.toLowerCase().includes(searchString2.toLowerCase()) || asset.WINSTORY_CUSTOMER_NAME.toLowerCase().includes(searchString2.toLowerCase()));
                                                                                                                    //         }
                                                                                                                    //         else {
                                                                                                                    //             return (asset.WINSTORY_NAME.toLowerCase().includes(searchString2.toLowerCase()) || asset.WINSTORY_USECASE.toLowerCase().includes(searchString2.toLowerCase()) || asset.WINSTORY_ID.toLowerCase().includes(searchString2.toLowerCase()));
                                                                                                                    //         }
                                                                                                                    //     })
                                                                                                                    //     allObj.TOTALCOUNT = filteredAssets.length;
                                                                                                                    //     tAssets = filteredAssets.slice(offset, limit);
                                                                                                                    //     dynamicSort(tAssets, sortBy, order);
                                                                                                                    //     allObj.WINSTORIES = tAssets;
                                                                                                                    //     resolve(allObj);
                                                                                                                    // }
                                                                                                                    // else {
                                                                                                                    let allObj = {};
                                                                                                                    allObj.TOTALCOUNT = allAssets.length;
                                                                                                                    tAssets = allAssets;
                                                                                                                    dynamicSort(tAssets, sortBy, order);
                                                                                                                    var tmp = tAssets.slice(offset, limit)
                                                                                                                    allObj.WINSTORIES = tmp;
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
            } catch (err) {
                console.log("DB error");
            }
        })
    }

    static WinsList(res) {
        // console.log('WinsList fn called');
        let assetsArray = res;
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
        connection.execute(`SELECT * from ASSET_WINSTORY_LINKS  where link_active='true'`, {},
            {
                outFormat: oracledb.OBJECT
            },
        ).then(res => {
            linksArray = res.rows;
            connection.query(`select Count(*) comment_count,WINSTORY_ID from asset_winstory_comments group by WINSTORY_ID`, [],
                {
                    outFormat: oracledb.OBJECT
                })
                .then(res => {
                    commentsArray = res;
                    connection.query(`select avg(rate) avg_rating,WINSTORY_ID from asset_winstory_rates group by WINSTORY_ID`, [],
                        {
                            outFormat: oracledb.OBJECT
                        }).then(res => {
                            ratingsArray = res;
                            connection.execute(`SELECT * from ASSET_IMAGES`, {},
                                {
                                    outFormat: oracledb.OBJECT
                                })
                                .then(res => {
                                    imagesArray = res.rows;
                                    connection.execute(`select m.filter_id,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Solution Area'`, {},
                                        {
                                            outFormat: oracledb.OBJECT
                                        })
                                        .then(res => {
                                            solutionAreasArray = res.rows;
                                            connection.execute(`select m.filter_id,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Asset Type'`, {},
                                                {
                                                    outFormat: oracledb.OBJECT
                                                })
                                                .then(res => {
                                                    assetTypesArray = res.rows;
                                                    connection.execute(`select m.filter_id,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Sales Play'`, {},
                                                        {
                                                            outFormat: oracledb.OBJECT
                                                        })
                                                        .then(res => {
                                                            salesPlaysArray = res.rows;
                                                            connection.execute(`select m.filter_id,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Industry'`, {},
                                                                {
                                                                    outFormat: oracledb.OBJECT
                                                                })
                                                                .then(res => {
                                                                    industryArray = res.rows;
                                                                    connection.execute(`SELECT count(*) like_count,WINSTORY_ID from ASSET_WINSTORY_LIKES group by WINSTORY_ID`, [],
                                                                        {
                                                                            outFormat: oracledb.OBJECT
                                                                        })
                                                                        .then(res => {
                                                                            likesArray = res.rows;
                                                                            connection.execute(`SELECT count(*) view_count,WINSTORY_ID from ASSET_WINSTORY_VIEWS group by WINSTORY_ID`, [],
                                                                                {
                                                                                    outFormat: oracledb.OBJECT
                                                                                })
                                                                                .then(res => {
                                                                                    viewsArray = res.rows;
                                                                                    connection.execute(`SELECT WINSTORY_ID from ASSET_WINSTORY_LOB_LEADER_PROMOTED_WINSTORY where status=1`, [],
                                                                                        {
                                                                                            outFormat: oracledb.OBJECT
                                                                                        })
                                                                                        .then(res => {
                                                                                            promotedArray = res.rows;
                                                                                            //console.log(viewsArray);
                                                                                            assetsArray.forEach(asset => {
                                                                                                const id = asset.WINSTORY_ID;

                                                                                                allAssetsObj = asset;
                                                                                                allAssetsObj.createdDate = allAssetsObj.WINSTORY_CREATED_ON;
                                                                                                let path = allAssetsObj.WINSTORY_THUMBNAIL;
                                                                                                if (path == null) {
                                                                                                    allAssetsObj.WINSTORY_THUMBNAIL = `http://${host}/winstorylogo/Logo_Thumbnail.png`
                                                                                                } else
                                                                                                    allAssetsObj.WINSTORY_THUMBNAIL = `http://${host}/${path}`;

                                                                                                let logopath = allAssetsObj.WINSTORY_LOGO;
                                                                                                if (logopath == null) {
                                                                                                    allAssetsObj.WINSTORY_LOGO = `http://${host}/winstorylogo/Logo_Thumbnail.png`
                                                                                                } else
                                                                                                    allAssetsObj.WINSTORY_LOGO = `http://${host}/${logopath}`;

                                                                                                allAssetsObj.LINKS = [];
                                                                                                var links = linksArray.filter(link => link.WINSTORY_ID == id)
                                                                                                //console.log(id + ' :links:', links);
                                                                                                //console.log(id + ' :solutionAreas:', solutionAreasArray);
                                                                                                solutionAreas = solutionAreasArray.filter(s => s.WINSTORY_ID == id);
                                                                                                assetTypes = assetTypesArray.filter(s => s.WINSTORY_ID == id);
                                                                                                salesPlays = salesPlaysArray.filter(s => s.WINSTORY_ID == id);
                                                                                                industry = industryArray.filter(s => s.WINSTORY_ID == id);
                                                                                                //console.log(solutionAreas);
                                                                                                allAssetsObj.SOLUTION_AREAS = solutionAreas
                                                                                                allAssetsObj.ASSET_TYPE = assetTypes;
                                                                                                allAssetsObj.SALES_PLAY = salesPlays;
                                                                                                allAssetsObj.INDUSTRY = industry;
                                                                                                linkType = links.map(a => a.LINK_REPOS_TYPE)
                                                                                                linkType = [...new Set(linkType)]
                                                                                                let promote = promotedArray.filter(s => s.WINSTORY_ID === id);
                                                                                                allAssetsObj.PROMOTE = promote.length == 0 ? false : true;
                                                                                                linkType.forEach(type => {
                                                                                                    var links2 = linksArray.filter(link => link.LINK_REPOS_TYPE === type && link.WINSTORY_ID === id)
                                                                                                    lobj.TYPE = type;
                                                                                                    lobj.arr = links2;
                                                                                                    lobj2 = lobj
                                                                                                    linkObjArr.push(lobj2);
                                                                                                    lobj = {}
                                                                                                })
                                                                                                allAssetsObj.LINKS = linkObjArr;
                                                                                                linkObjArr = [];
                                                                                                var images = imagesArray.filter(image => image.WINSTORY_ID === id);
                                                                                                allAssetsObj.IMAGES = images;
                                                                                                var comments = commentsArray.filter(c => c.WINSTORY_ID === id);
                                                                                                var ratings = ratingsArray.filter(r => r.WINSTORY_ID === id)
                                                                                                var likes = likesArray.filter(l => l.WINSTORY_ID === id)
                                                                                                var views = viewsArray.filter(v => v.WINSTORY_ID === id)
                                                                                                if (comments[0]) {
                                                                                                    delete comments[0].WINSTORY_ID;
                                                                                                }
                                                                                                if (!comments.length) {
                                                                                                    comments.push({ COMMENT_COUNT: 0 });
                                                                                                }
                                                                                                if (!ratings.length) {
                                                                                                    ratings.push({ AVG_RATING: 0, WINSTORY_ID: id })
                                                                                                }
                                                                                                if (!likes.length) {
                                                                                                    likes.push({ LIKE_COUNT: 0, WINSTORY_ID: id })
                                                                                                }
                                                                                                if (!views.length) {
                                                                                                    views.push({ VIEW_COUNT: 0, WINSTORY_ID: id })
                                                                                                }
                                                                                                allAssetsObj.COMMENTS = comments[0];
                                                                                                allAssetsObj.RATINGS = ratings[0];
                                                                                                allAssetsObj.LIKES = likes[0];
                                                                                                allAssetsObj.VIEWS = views[0];
                                                                                                if (!(sortBy == 'views' && allAssetsObj.VIEWS.VIEW_COUNT == 0)) {
                                                                                                    allAssets.push(allAssetsObj);
                                                                                                }

                                                                                            })
                                                                                            let allObj = {};
                                                                                            allObj.TOTALCOUNT = allAssets.length;
                                                                                            tAssets = allAssets;
                                                                                            dynamicSort(tAssets, sortBy, order);
                                                                                            var tmp = tAssets.slice(offset, limit)
                                                                                            allObj.WINSTORIES = tmp;
                                                                                            resolve(allObj);


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
    };

    static fetchwinstoryById(host, assetId) {
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

        return new Promise((resolve, reject) => {
            getwinstoryById(assetId)
                .then(res => {
                    // //console.log(res)
                    assetObj = res[0];
                    if (!res.length > 0) {
                        var temp = { "TOTALCOUNT": 0, "WINSTORIES": [] }
                        resolve(temp);
                    }
                    else {
                        //resolve(res[0])
                        getLinksById(assetId)
                            .then(res => {
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
                                getImagesById(assetId)
                                    .then(res => {
                                        //  //console.log(res)
                                        assetObj.IMAGES = res
                                        getCommentsById(assetId)
                                            .then(res => {
                                                assetObj.COMMENTS = res;
                                                getRatingsById(assetId)
                                                    .then(res => {
                                                        getSolutionAreasByAssetId(assetId)
                                                            .then(res => {
                                                                solutionAreas = res
                                                                getSalesPlayByAssetId(assetId)
                                                                    .then(res => {
                                                                        assetObj.SALES_PLAY = res
                                                                        getIndustryByAssetId(assetId)
                                                                            .then(res => {
                                                                                assetObj.INDUSTRY = res;
                                                                                getPromoteById(assetId)
                                                                                    .then(res => {
                                                                                        assetObj.PROMOTE = res.length == 0 ? false : true;
                                                                                        getAssetTypesByAssetId(assetId)
                                                                                            .then(res => {
                                                                                                assetTypes = res
                                                                                                getWinStatusByAssetId(assetId)
                                                                                                    .then(res => {
                                                                                                        let winStatus = res
                                                                                                        assetObj.WIN_STATUS = winStatus
                                                                                                        assetObj.SOLUTION_AREAS = solutionAreas
                                                                                                        assetObj.ASSET_TYPE = assetTypes
                                                                                                        var avgArr = res.map(r => r.RATE);
                                                                                                        assetObj.AVG_RATING = avgArr.reduce((a, b) => a + b, 0) / avgArr.length;
                                                                                                        getAssetFilterMapByIdandType(assetId).then(res => {
                                                                                                            filterArr = [...res]
                                                                                                            filterType = filterArr.map(a => a.FILTER_TYPE)
                                                                                                            filterType = [...new Set(filterType)]
                                                                                                            // console.log(filterType)
                                                                                                            filterType.forEach(type => {
                                                                                                                filterTypeArr = filterArr.filter(f => f.FILTER_TYPE === type)
                                                                                                                filterObj.TYPE = type;
                                                                                                                filterObj.arr = filterTypeArr;
                                                                                                                filterArrFinal.push(filterObj)
                                                                                                                filterObj = {};
                                                                                                            })
                                                                                                            //console.log(filterObj)
                                                                                                            let path = assetObj.WINSTORY_THUMBNAIL;
                                                                                                            if (path == null) {
                                                                                                                assetObj.WINSTORY_THUMBNAIL = `http://${host}/winstorylogo/Logo_Thumbnail.png`
                                                                                                            } else
                                                                                                                assetObj.WINSTORY_THUMBNAIL = `http://${host}/${path}`;

                                                                                                            let logopath = assetObj.WINSTORY_LOGO;
                                                                                                            if (logopath == null) {
                                                                                                                assetObj.WINSTORY_LOGO = `http://${host}/winstorylogo/Logo_Thumbnail.png`
                                                                                                            } else
                                                                                                                assetObj.WINSTORY_LOGO = `http://${host}/${logopath}`;
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
            (select count(*) from asset_winstory_details where asset_status='Live') "asset_Count",
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

                            resolve(bannerObj)
                        })

                })
                .catch(err => {
                    reject(err)

                })
        })
    }



    static getSocialDataByAssetId(assetId, userId) {
        let assetSocialObj = {}
        return new Promise((resolve, reject) => {
            getCommentsById(assetId)
                .then(comments => {
                    assetSocialObj.COMMENTS = comments;
                    getLikesByAssetId(assetId)
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
    static winstoryimperativeList() {
        let typeArr = [];
        let filteredArr = [];
        let allFilters = [];
        let filterObj = {};
        let finalFilterObj = {}
        return new Promise((resolve, reject) => {
            const connection = getDb();
            connection.query(`select * from ASSET_WINSTORY_IMPERATIVE`, [],
                {
                    outFormat: oracledb.OBJECT
                })
                .then(filters => {
                    typeArr = filters.map(f => f.FILTER_TYPE)
                    typeArr = [...new Set(typeArr)]
                    typeArr.forEach(type => {
                        filteredArr = filters.filter(f => f.FILTER_TYPE === type && !f.FILTER_NAME.toLowerCase().includes('other'));
                        filterObj.Type = type;
                        filterObj.FILTER_TYPE_IMAGE = filteredArr[0].FILTER_TYPE_IMAGE;
                        filteredArr.sort((a, b) => (a.FILTER_NAME > b.FILTER_NAME) ? 1 : -1)
                        const otherArr = filters.filter(f => f.FILTER_TYPE === type && f.FILTER_NAME.toLowerCase().includes('other'))
                        if (otherArr.length === 1) {
                            filteredArr.push(otherArr[0]);
                        }
                        else {
                            otherArr.forEach(o => {
                                filteredArr.push(o)
                            })
                        }
                        filterObj.SubFilters = filteredArr;

                        allFilters.push(filterObj);
                        filterObj = {};
                    })
                    finalFilterObj.allOtherFilters = allFilters;
                    resolve(finalFilterObj)
                })
                .catch(err => {
                    reject(err)
                })
        })
    }
    static winstorysolutionusecaseList() {
        let finalFilterObj = {}
        return new Promise((resolve, reject) => {
            const connection = getDb();
            connection.query(`select * from ASSET_WINSTORY_SOLUTION_USECASE`, [],
                {
                    outFormat: oracledb.OBJECT
                })
                .then(filters => {
                    finalFilterObj.Solution_Usecase = filters;
                    resolve(finalFilterObj)
                })
                .catch(err => {
                    reject(err)
                })
        })
    }
    static WinstoryLobsList() {
        //console.log('WinstoryLobs modal');
        let typeArr = [];
        let filteredArr = [];
        let allFilters = [];
        let filterObj = {};
        let userPreferencesArr = [];
        let finalFilterObj = {}
        let countArr = [];
        let typeCountArr = [];
        return new Promise((resolve, reject) => {
            const connection = getDb();
            connection.query(`select * from asset_winstory_lob`, [],
                {
                    outFormat: oracledb.OBJECT
                })
                .then(filters => {
                    typeArr = filters.map(f => f.LOB_TYPE)
                    typeArr = [...new Set(typeArr)]
                    typeArr.forEach(type => {
                        filteredArr = filters.filter(f => f.LOB_TYPE === type && !f.LOB_NAME.toLowerCase().includes('other'));
                        filterObj.Type = type;
                        filterObj.LOB_TYPE_IMAGE = filteredArr[0].LOB_TYPE_IMAGE;
                        filteredArr.sort((a, b) => (a.LOB_NAME > b.LOB_NAME) ? 1 : -1)
                        const otherArr = filters.filter(f => f.LOB_TYPE === type && f.LOB_NAME.toLowerCase().includes('other'))
                        if (otherArr.length === 1) {
                            filteredArr.push(otherArr[0]);
                        }
                        else {
                            otherArr.forEach(o => {
                                filteredArr.push(o)
                            })
                        }
                        filterObj.lobs = filteredArr;

                        allFilters.push(filterObj);
                        filterObj = {};
                    })
                    finalFilterObj.allLobs = allFilters;
                    resolve(finalFilterObj)
                })
                .catch(err => {
                    reject(err)
                })
        })
    }

    static getFilters(user_email) {
        let typeArr = [];
        let filteredArr = [];
        let allFilters = [];
        let filterObj = {};
        let userPreferencesArr = [];
        let finalFilterObj = {}
        let countArr = [];
        let typeCountArr = [];
        return new Promise((resolve, reject) => {
            const connection = getDb();
            connection.query(`select * from asset_winstory_filters`, [],
                {
                    outFormat: oracledb.OBJECT
                })
                .then(filters => {
                    typeArr = filters.map(f => f.FILTER_TYPE)
                    typeArr = [...new Set(typeArr)]
                    typeArr.forEach(type => {
                        filteredArr = filters.filter(f => f.FILTER_TYPE === type && !f.FILTER_NAME.toLowerCase().includes('other'));
                        filterObj.Type = type;
                        filterObj.FILTER_TYPE_IMAGE = filteredArr[0].FILTER_TYPE_IMAGE;
                        filteredArr.sort((a, b) => (a.FILTER_NAME > b.FILTER_NAME) ? 1 : -1)
                        const otherArr = filters.filter(f => f.FILTER_TYPE === type && f.FILTER_NAME.toLowerCase().includes('other'))
                        if (otherArr.length === 1) {
                            filteredArr.push(otherArr[0]);
                        }
                        else {
                            otherArr.forEach(o => {
                                filteredArr.push(o)
                            })
                        }
                        filterObj.filters = filteredArr;

                        allFilters.push(filterObj);
                        filterObj = {};
                    })
                    finalFilterObj.allFilters = allFilters;
                    resolve(finalFilterObj)
                })
                .catch(err => {
                    reject(err)
                })
        })
    }





    static getFavWins(user_email, host) {
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
        let industry = [];
        let industryArray = [];
        return new Promise((resolve, reject) => {
            const connection = getDb();
            connection.query(`select * from asset_winstory_details where WINSTORY_ID in (select WINSTORY_ID from ASSET_WINSTORY_LIKES where LIKE_BY=:LIKE_BY)`, [user_email],
                {
                    outFormat: oracledb.OBJECT
                })
                .then(res => {
                    assetsArray = res
                    connection.query(`select Count(*) comment_count,WINSTORY_ID from ASSET_WINSTORY_COMMENTS group by WINSTORY_ID`, [],
                        {
                            outFormat: oracledb.OBJECT
                        })
                        .then(res => {
                            //console.log("comment count",res)
                            commentsArray = res;
                            connection.execute(`SELECT count(*) like_count,WINSTORY_ID from ASSET_WINSTORY_LIKES group by WINSTORY_ID`, [],
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
                                            connection.execute(`select m.filter_id,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Solution Area'`, {},
                                                {
                                                    outFormat: oracledb.OBJECT
                                                })
                                                .then(res => {
                                                    solutionAreasArray = res.rows;
                                                    connection.execute(`select m.filter_id,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Asset Type'`, {},
                                                        {
                                                            outFormat: oracledb.OBJECT
                                                        })
                                                        .then(res => {
                                                            assetTypesArray = res.rows; connection.execute(`select m.filter_id,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Sales Play'`, {},
                                                                {
                                                                    outFormat: oracledb.OBJECT
                                                                })
                                                                .then(res => {
                                                                    salesPlaysArray = res.rows;
                                                                    connection.execute(`select m.filter_id,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Industry'`, {},
                                                                        {
                                                                            outFormat: oracledb.OBJECT
                                                                        })
                                                                        .then(res => {
                                                                            industryArray = res.rows;
                                                                            connection.execute(`select m.filter_id,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Win Status'`, {},
                                                                                {
                                                                                    outFormat: oracledb.OBJECT
                                                                                })
                                                                                .then(res => {
                                                                                    let winStatusArray = res.rows;
                                                                                    connection.execute(`SELECT * from ASSET_WINSTORY_LINKS  where link_active='true'`, {},
                                                                                        {
                                                                                            outFormat: oracledb.OBJECT
                                                                                        }).then(res => {
                                                                                            linksArray = res.rows
                                                                                            connection.execute(`SELECT count(*) view_count,WINSTORY_ID from ASSET_WINSTORY_VIEWS group by WINSTORY_ID`, [],
                                                                                                {
                                                                                                    outFormat: oracledb.OBJECT
                                                                                                })
                                                                                                .then(res => {
                                                                                                    viewsArray = res.rows
                                                                                                    //console.log("All Arrays",assetsArray,likesArray,viewsArray)
                                                                                                    assetsArray.forEach(asset => {
                                                                                                        allAssetsObj = asset;
                                                                                                        allAssetsObj.createdDate = allAssetsObj.WINSTORY_CREATED_ON;
                                                                                                        let path = allAssetsObj.WINSTORY_THUMBNAIL;
                                                                                                        if (path == null) {
                                                                                                            allAssetsObj.WINSTORY_THUMBNAIL = `http://${host}/winstorylogo/Logo_Thumbnail.png`
                                                                                                        } else
                                                                                                            allAssetsObj.WINSTORY_THUMBNAIL = `http://${host}/${path}`;

                                                                                                        let logopath = allAssetsObj.WINSTORY_LOGO;
                                                                                                        if (logopath == null) {
                                                                                                            allAssetsObj.WINSTORY_LOGO = `http://${host}/winstorylogo/Logo_Thumbnail.png`
                                                                                                        } else
                                                                                                            allAssetsObj.WINSTORY_LOGO = `http://${host}/${logopath}`;
                                                                                                        const id = asset.WINSTORY_ID;
                                                                                                        allAssetsObj.LINKS = [];
                                                                                                        var links = linksArray.filter(link => link.WINSTORY_ID === id)
                                                                                                        ////console.log('links:',links)
                                                                                                        solutionAreas = solutionAreasArray.filter(s => s.WINSTORY_ID == id);
                                                                                                        assetTypes = assetTypesArray.filter(s => s.WINSTORY_ID == id);
                                                                                                        salesPlays = salesPlaysArray.filter(s => s.WINSTORY_ID == id);
                                                                                                        industry = industryArray.filter(s => s.WINSTORY_ID == id);
                                                                                                        let winStatus = winStatusArray.filter(s => s.WINSTORY_ID == id);
                                                                                                        allAssetsObj.WIN_STATUS = winStatus
                                                                                                        allAssetsObj.SOLUTION_AREAS = solutionAreas
                                                                                                        allAssetsObj.ASSET_TYPE = assetTypes;
                                                                                                        allAssetsObj.SALES_PLAY = salesPlays;
                                                                                                        allAssetsObj.INDUSTRY = industry;
                                                                                                        linkType = links.map(a => a.LINK_REPOS_TYPE)
                                                                                                        linkType = [...new Set(linkType)]
                                                                                                        ////console.log(linkType)
                                                                                                        linkType.forEach(type => {
                                                                                                            var links2 = linksArray.filter(link => link.LINK_REPOS_TYPE === type && link.WINSTORY_ID === id)
                                                                                                            lobj.TYPE = type;
                                                                                                            lobj.arr = links2;
                                                                                                            lobj2 = lobj
                                                                                                            linkObjArr.push(lobj2);
                                                                                                            lobj = {}
                                                                                                        })
                                                                                                        allAssetsObj.LINKS = linkObjArr;

                                                                                                        linkObjArr = [];
                                                                                                        ////console.log(lobj2,"obj2")
                                                                                                        var images = imagesArray.filter(image => image.WINSTORY_ID === id);
                                                                                                        allAssetsObj.IMAGES = images;
                                                                                                        var likes = likesArray.filter(l => l.WINSTORY_ID === id)
                                                                                                        var comments = commentsArray.filter(c => c.WINSTORY_ID === id)
                                                                                                        var views = viewsArray.filter(v => v.WINSTORY_ID === id)
                                                                                                        if (!comments.length) {
                                                                                                            comments.push({ COMMENT_COUNT: 0 });
                                                                                                        }
                                                                                                        if (!likes.length) {
                                                                                                            likes.push({ LIKE_COUNT: 0, WINSTORY_ID: id })
                                                                                                        }
                                                                                                        if (!views.length) {
                                                                                                            views.push({ VIEW_COUNT: 0, WINSTORY_ID: id })
                                                                                                        }
                                                                                                        allAssetsObj.LIKES = likes[0];
                                                                                                        allAssetsObj.VIEWS = views[0];
                                                                                                        allAssetsObj.COMMENTS = comments[0];
                                                                                                        //console.log(allAssetsObj)
                                                                                                        allAssetsFinalArray.push(allAssetsObj)
                                                                                                        allAssetsObj = {};
                                                                                                    })
                                                                                                    allObj.TOTALCOUNT = allAssetsFinalArray.length;
                                                                                                    allObj.WINSTORIES = allAssetsFinalArray;
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



    static getAssetsByLob(lob) {
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
        let promotedArray = [];
        return new Promise((resolve, reject) => {
            const connection = getDb();
            let lobQuerySql;
            let lobQueryOptions;
            let promoteQuerySql;
            let promoteQueryOptions;
            if (lob !== 'Others') {
                lobQuerySql = `select * from asset_winstory_details where WINSTORY_ID in (select WINSTORY_ID from asset_winstory_lob_asset_map where lob_id in (select lob_id from asset_lobs where lob_name=:LOB_NAME)) and winstory_status='Live'`
                lobQueryOptions = [lob]
                promoteQuerySql = `SELECT WINSTORY_ID from ASSET_WINSTORY_LOB_LEADER_PROMOTED_WINSTORY where status=1 and (LOB_LEADER_LOB=:LOB_NAME or LOB_LEADER_LOB='Others')`
                promoteQueryOptions = [lob]
            }
            else {
                lobQuerySql = `select * from asset_winstory_details where WINSTORY_ID in (select distinct WINSTORY_ID from asset_winstory_lob_asset_map) and winstory_status='Live'`;
                lobQueryOptions = [];
                promoteQuerySql = `SELECT WINSTORY_ID from ASSET_WINSTORY_LOB_LEADER_PROMOTED_WINSTORY where status=1 and LOB_LEADER_LOB=:LOB_NAME`
                promoteQueryOptions = [lob]
            }
            connection.query(lobQuerySql, lobQueryOptions,
                {
                    outFormat: oracledb.OBJECT
                })
                .then(res => {
                    assetsArray = res
                    connection.query(promoteQuerySql, promoteQueryOptions,
                        {
                            outFormat: oracledb.OBJECT
                        })
                        .then(res => {
                            promotedArray = res;
                            connection.query(`select Count(*) comment_count,WINSTORY_ID from 
                    asset_winstory_comments group by WINSTORY_ID`, [],
                                {
                                    outFormat: oracledb.OBJECT
                                })
                                .then(res => {
                                    //console.log("comment count",res)
                                    commentsArray = res;
                                    connection.execute(`SELECT count(*) like_count,WINSTORY_ID from ASSET_LIKES group by WINSTORY_ID`, [],
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
                                                    connection.execute(`select m.filter_id,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Solution Area'`, {},
                                                        {
                                                            outFormat: oracledb.OBJECT
                                                        })
                                                        .then(res => {
                                                            solutionAreasArray = res.rows;
                                                            connection.execute(`select m.filter_id,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Asset Type'`, {},
                                                                {
                                                                    outFormat: oracledb.OBJECT
                                                                })
                                                                .then(res => {
                                                                    assetTypesArray = res.rows;
                                                                    connection.execute(`SELECT * from ASSET_LINKS where link_active='true'`, {},
                                                                        {
                                                                            outFormat: oracledb.OBJECT
                                                                        }).then(res => {
                                                                            linksArray = res.rows
                                                                            connection.execute(`SELECT count(*) view_count,WINSTORY_ID from ASSET_VIEWS group by WINSTORY_ID`, [],
                                                                                {
                                                                                    outFormat: oracledb.OBJECT
                                                                                })
                                                                                .then(res => {
                                                                                    viewsArray = res.rows
                                                                                    //console.log("All Arrays",assetsArray,likesArray,viewsArray)
                                                                                    assetsArray.forEach(asset => {
                                                                                        allAssetsObj = asset;
                                                                                        const id = asset.WINSTORY_ID;
                                                                                        allAssetsObj.LINKS = [];
                                                                                        var links = linksArray.filter(link => link.WINSTORY_ID === id)
                                                                                        ////console.log('links:',links)
                                                                                        solutionAreas = solutionAreasArray.filter(s => s.WINSTORY_ID === id)
                                                                                        allAssetsObj.SOLUTION_AREAS = solutionAreas
                                                                                        assetTypes = assetTypesArray.filter(s => s.WINSTORY_ID === id)
                                                                                        allAssetsObj.ASSET_TYPE = assetTypes
                                                                                        linkType = links.map(a => a.LINK_REPOS_TYPE)
                                                                                        linkType = [...new Set(linkType)]
                                                                                        let promote = promotedArray.filter(s => s.WINSTORY_ID === id);
                                                                                        allAssetsObj.PROMOTE = promote.length == 0 ? false : true;
                                                                                        ////console.log(linkType)
                                                                                        linkType.forEach(type => {
                                                                                            var links2 = linksArray.filter(link => link.LINK_REPOS_TYPE === type && link.WINSTORY_ID === id)
                                                                                            lobj.TYPE = type;
                                                                                            lobj.arr = links2;
                                                                                            lobj2 = lobj
                                                                                            linkObjArr.push(lobj2);
                                                                                            lobj = {}
                                                                                        })
                                                                                        allAssetsObj.LINKS = linkObjArr;

                                                                                        linkObjArr = [];
                                                                                        ////console.log(lobj2,"obj2")
                                                                                        var images = imagesArray.filter(image => image.WINSTORY_ID === id);
                                                                                        allAssetsObj.IMAGES = images;
                                                                                        var likes = likesArray.filter(l => l.WINSTORY_ID === id)
                                                                                        var comments = commentsArray.filter(c => c.WINSTORY_ID === id)
                                                                                        var views = viewsArray.filter(v => v.WINSTORY_ID === id)
                                                                                        if (!comments.length) {
                                                                                            comments.push({ COMMENT_COUNT: 0 });
                                                                                        }
                                                                                        if (!likes.length) {
                                                                                            likes.push({ LIKE_COUNT: 0, WINSTORY_ID: id })
                                                                                        }
                                                                                        if (!views.length) {
                                                                                            views.push({ VIEW_COUNT: 0, WINSTORY_ID: id })
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



    static getWinsByLob(host, lob) {
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
        let industry = [];
        let industryArray = [];
        let promotedArray = []
        // console.log("Inside getWinsByLob: " + lob);
        return new Promise((resolve, reject) => {
            const connection = getDb();
            let lobQuerySql;
            let lobQueryOptions;
            let promoteQuerySql;
            let promoteQueryOptions;
            if (lob != 'Others') {
                lobQuerySql = `select * from asset_winstory_details where WINSTORY_ID in (select WINSTORY_ID from ASSET_WINSTORY_LOB_MAP where lob_id in (select lob_id from asset_lobs where lob_name=:LOB_NAME or lob_name='Others')) and WINSTORY_STATUS='Live'`
                lobQueryOptions = [lob]
                promoteQuerySql = `SELECT WINSTORY_ID from ASSET_WINSTORY_LOB_LEADER_PROMOTED_WINSTORY where status=1 and (LOB_LEADER_LOB=:LOB_NAME or LOB_LEADER_LOB='Others')`
                promoteQueryOptions = [lob]
            }
            else {
                lobQuerySql = `select * from asset_winstory_details where WINSTORY_ID in (select distinct WINSTORY_ID from ASSET_WINSTORY_LOB_MAP) and WINSTORY_STATUS='Live'`;
                lobQueryOptions = [];
                promoteQuerySql = `SELECT WINSTORY_ID from ASSET_WINSTORY_LOB_LEADER_PROMOTED_WINSTORY where status=1`
                promoteQueryOptions = []
            }
            connection.query(lobQuerySql, lobQueryOptions,
                {
                    outFormat: oracledb.OBJECT
                })
                .then(res => {
                    assetsArray = res
                    // console.log('Calling WinsList')
                    //WinsList(res);
                    connection.query(promoteQuerySql, promoteQueryOptions,
                        {
                            outFormat: oracledb.OBJECT
                        })
                        .then(res => {
                            promotedArray = res;
                            connection.query(`select Count(*) comment_count,WINSTORY_ID from 
                    asset_winstory_comments group by WINSTORY_ID`, [],
                                {
                                    outFormat: oracledb.OBJECT
                                })
                                .then(res => {
                                    //console.log("comment count",res)
                                    commentsArray = res;
                                    connection.execute(`SELECT count(*) like_count,WINSTORY_ID from asset_winstory_likes group by WINSTORY_ID`, [],
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
                                                    connection.execute(`select m.filter_id,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Solution Area'`, {},
                                                        {
                                                            outFormat: oracledb.OBJECT
                                                        })
                                                        .then(res => {
                                                            solutionAreasArray = res.rows;
                                                            connection.execute(`select m.filter_id,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Asset Type'`, {},
                                                                {
                                                                    outFormat: oracledb.OBJECT
                                                                })
                                                                .then(res => {
                                                                    assetTypesArray = res.rows;
                                                                    connection.execute(`select m.filter_id,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Sales Play'`, {},
                                                                        {
                                                                            outFormat: oracledb.OBJECT
                                                                        })
                                                                        .then(res => {
                                                                            salesPlaysArray = res.rows;
                                                                            connection.execute(`select m.filter_id,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Industry'`, {},
                                                                                {
                                                                                    outFormat: oracledb.OBJECT
                                                                                })
                                                                                .then(res => {
                                                                                    industryArray = res.rows;
                                                                                    connection.execute(`SELECT * from ASSET_WINSTORY_LINKS  where link_active='true'`, {},
                                                                                        {
                                                                                            outFormat: oracledb.OBJECT
                                                                                        }).then(res => {
                                                                                            linksArray = res.rows
                                                                                            connection.execute(`SELECT count(*) view_count,WINSTORY_ID from ASSET_WINSTORY_VIEWS group by WINSTORY_ID`, [],
                                                                                                {
                                                                                                    outFormat: oracledb.OBJECT
                                                                                                })
                                                                                                .then(res => {
                                                                                                    viewsArray = res.rows
                                                                                                    connection.execute(`select m.filter_id,f.filter_name,m.WINSTORY_ID from asset_winstory_filter_winstory_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Win Status'`, {},
                                                                                                        {
                                                                                                            outFormat: oracledb.OBJECT
                                                                                                        })
                                                                                                        .then(res => {
                                                                                                            let winStatusArray = res.rows;
                                                                                                            //console.log("All Arrays",assetsArray,likesArray,viewsArray)
                                                                                                            assetsArray.forEach(asset => {
                                                                                                                allAssetsObj = asset;
                                                                                                                const id = asset.WINSTORY_ID;
                                                                                                                allAssetsObj.createdDate = allAssetsObj.WINSTORY_CREATED_ON;
                                                                                                                let path = allAssetsObj.WINSTORY_THUMBNAIL;
                                                                                                                if (path == null) {
                                                                                                                    allAssetsObj.WINSTORY_THUMBNAIL = `http://${host}/winstorylogo/Logo_Thumbnail.png`
                                                                                                                } else
                                                                                                                    allAssetsObj.WINSTORY_THUMBNAIL = `http://${host}/${path}`;

                                                                                                                let logopath = allAssetsObj.WINSTORY_LOGO;
                                                                                                                if (logopath == null) {
                                                                                                                    allAssetsObj.WINSTORY_LOGO = `http://${host}/winstorylogo/Logo_Thumbnail.png`
                                                                                                                } else
                                                                                                                    allAssetsObj.WINSTORY_LOGO = `http://${host}/${logopath}`;
                                                                                                                allAssetsObj.LINKS = [];
                                                                                                                var links = linksArray.filter(link => link.WINSTORY_ID === id)
                                                                                                                ////console.log('links:',links)
                                                                                                                solutionAreas = solutionAreasArray.filter(s => s.WINSTORY_ID == id);
                                                                                                                assetTypes = assetTypesArray.filter(s => s.WINSTORY_ID == id);
                                                                                                                salesPlays = salesPlaysArray.filter(s => s.WINSTORY_ID == id);
                                                                                                                industry = industryArray.filter(s => s.WINSTORY_ID == id);
                                                                                                                allAssetsObj.SOLUTION_AREAS = solutionAreas
                                                                                                                allAssetsObj.ASSET_TYPE = assetTypes;
                                                                                                                allAssetsObj.SALES_PLAY = salesPlays;
                                                                                                                allAssetsObj.INDUSTRY = industry;
                                                                                                                let winStatus = winStatusArray.filter(s => s.WINSTORY_ID == id);

                                                                                                                let promote = promotedArray.filter(s => s.WINSTORY_ID === id);
                                                                                                                allAssetsObj.PROMOTE = promote.length == 0 ? false : true;
                                                                                                                linkType = links.map(a => a.LINK_REPOS_TYPE)
                                                                                                                linkType = [...new Set(linkType)]
                                                                                                                ////console.log(linkType)
                                                                                                                linkType.forEach(type => {
                                                                                                                    var links2 = linksArray.filter(link => link.LINK_REPOS_TYPE === type && link.WINSTORY_ID === id)
                                                                                                                    lobj.TYPE = type;
                                                                                                                    lobj.arr = links2;
                                                                                                                    lobj2 = lobj
                                                                                                                    linkObjArr.push(lobj2);
                                                                                                                    lobj = {}
                                                                                                                })
                                                                                                                allAssetsObj.LINKS = linkObjArr;

                                                                                                                linkObjArr = [];
                                                                                                                ////console.log(lobj2,"obj2")
                                                                                                                var images = imagesArray.filter(image => image.WINSTORY_ID === id);
                                                                                                                allAssetsObj.IMAGES = images;
                                                                                                                var likes = likesArray.filter(l => l.WINSTORY_ID === id)
                                                                                                                var comments = commentsArray.filter(c => c.WINSTORY_ID === id)
                                                                                                                var views = viewsArray.filter(v => v.WINSTORY_ID === id)
                                                                                                                if (!comments.length) {
                                                                                                                    comments.push({ COMMENT_COUNT: 0 });
                                                                                                                }
                                                                                                                if (!likes.length) {
                                                                                                                    likes.push({ LIKE_COUNT: 0, WINSTORY_ID: id })
                                                                                                                }
                                                                                                                if (!views.length) {
                                                                                                                    views.push({ VIEW_COUNT: 0, WINSTORY_ID: id })
                                                                                                                }
                                                                                                                allAssetsObj.LIKES = likes[0];
                                                                                                                allAssetsObj.VIEWS = views[0];
                                                                                                                allAssetsObj.COMMENTS = comments[0];
                                                                                                                //console.log(allAssetsObj)
                                                                                                                allAssetsFinalArray.push(allAssetsObj)
                                                                                                                allAssetsObj = {};
                                                                                                            })
                                                                                                            allObj.TOTALCOUNT = allAssetsFinalArray.length;
                                                                                                            allObj.WINSTORIES = allAssetsFinalArray;
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
        })
    }

    static getMyWinstory(host, user_email) {
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
            connection.query(`select * from ASSET_WINSTORY_DETAILS where WINSTORY_CREATED_BY like '%` + user_email + `%'`, {},
                {
                    outFormat: oracledb.OBJECT
                })
                .then(res => {
                    // res.forEach(element => {
                    //     element.ASSET_REVIEW_NOTE = JSON.parse(element.ASSET_REVIEW_NOTE)

                    // });
                    assetsArray = res
                    connection.query(`select Count(*) comment_count,WINSTORY_ID from asset_winstory_comments group by WINSTORY_ID`, [],
                        {
                            outFormat: oracledb.OBJECT
                        })
                        .then(res => {
                            //console.log("comment count",res)
                            commentsArray = res;
                            connection.execute(`SELECT count(*) like_count,WINSTORY_ID from asset_winstory_likes group by WINSTORY_ID`, [],
                                {
                                    outFormat: oracledb.OBJECT
                                })
                                .then(res => {
                                    //console.log("LIKES",res)
                                    likesArray = res.rows;
                                    connection.execute(`SELECT count(*) view_count,WINSTORY_ID from asset_winstory_views group by WINSTORY_ID`, [],
                                        {
                                            outFormat: oracledb.OBJECT
                                        })
                                        .then(res => {
                                            viewsArray = res.rows
                                            statusArr = assetsArray.map(a => a.WINSTORY_STATUS)
                                            statusArr = [...new Set(statusArr)];
                                            //console.log("status Array",statusArr)
                                            tempStatusArr = allStatusList.filter(s => statusArr.indexOf(s) === -1)
                                            // console.log("temp status arr", tempStatusArr)
                                            statusArr = [...statusArr, ...tempStatusArr]
                                            statusArr = [...new Set(statusArr)];
                                            // console.log("updated status arr", statusArr)
                                            statusArr.forEach(status => {                                                             //loop each asset status type
                                                //console.log(status + ' Array Length' + assetsArray.length);
                                                filteredAssetsArray = assetsArray.filter(a => a.WINSTORY_STATUS === status)
                                                statusObj.status = status;
                                                //console.log("filteredAssetsArray", filteredAssetsArray)
                                                filteredAssetsArray.forEach(asset => {           //loop each asset for current status type
                                                    allAssetsObj = asset;
                                                    const id = asset.WINSTORY_ID;
                                                    var likes = likesArray.filter(l => l.WINSTORY_ID === id)
                                                    var comments = commentsArray.filter(c => c.WINSTORY_ID === id)
                                                    var views = viewsArray.filter(v => v.WINSTORY_ID === id)
                                                    if (!comments.length) {
                                                        comments.push({ COMMENT_COUNT: 0 });
                                                    }
                                                    if (!likes.length) {
                                                        likes.push({ LIKE_COUNT: 0, WINSTORY_ID: id })
                                                    }
                                                    if (!views.length) {
                                                        views.push({ VIEW_COUNT: 0, WINSTORY_ID: id })
                                                    }
                                                    allAssetsObj.LIKES = likes[0];
                                                    allAssetsObj.VIEWS = views[0];
                                                    allAssetsObj.COMMENTS = comments[0];

                                                    let path = allAssetsObj.WINSTORY_THUMBNAIL;
                                                    if (path == null) {
                                                        allAssetsObj.WINSTORY_THUMBNAIL = `http://${host}/winstorylogo/Logo_Thumbnail.png`
                                                    } else
                                                        allAssetsObj.WINSTORY_THUMBNAIL = `http://${host}/${path}`;

                                                    let logopath = allAssetsObj.WINSTORY_LOGO;
                                                    if (logopath == null) {
                                                        allAssetsObj.WINSTORY_LOGO = `http://${host}/winstorylogo/Logo_Thumbnail.png`
                                                    } else
                                                        allAssetsObj.WINSTORY_LOGO = `http://${host}/${logopath}`;

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
        let saveFeedbackSql = `insert into asset_feedback (FEEDBACK_RESPONSE,WINSTORY_ID,FEEDBACK_BY,FEEDBACK_CREATEDON) values(:0,:1,:2,:3)`;
        let saveFeedbackOptions = [feedback, assetid, email, new Date()];

        connection.execute(saveFeedbackSql, saveFeedbackOptions, {
            autoCommit: true
        }).then(result => {
            if (result.rowsAffected === 0) {
                console.log("Could not capture feedback. . .");
                res.status(404).json({ status: "FAILED", msg: "Could not capture feedback " });
            } else {
                console.log("feedback is captured. . .");
                res.json({ status: "feedback saved successfully" })
            }

        }).catch(err => {
            console.log("Error occurred while saving feedback : " + JSON.stringify(err));
            res.status(500).json({ status: "feedback captured failed", msg: JSON.stringify(err) })
        })
    }

}