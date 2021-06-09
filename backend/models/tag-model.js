const getDb = require('../database/db').getDb;
const oracledb = require('oracledb');
var uniqid = require('uniqid');
const path = require('path');
let base64 = require('base-64');
let fs = require('fs');
exports.getParentTags = (request) => {
    // console.log(JSON.stringify(request));
    const connection = getDb();
    let countArr = [];
    return new Promise((resolve, reject) => {
        let qry = `select * from ASSET_TAGS where FILTER_PARENT_ID 
        in(select filter_id from asset_tags where filter_parent_id is null) and filter_status='1' 
        union
        select * from ASSET_TAGS where FILTER_PARENT_ID is null and filter_status='1'`;
        let qryOptions = [];
        connection.query(`select count(*) cnt,b.filter_id from asset_filter_asset_map a, asset_tags b
        where a.filter_id=b.filter_id group by b.filter_id`, [],
            {
                outFormat: oracledb.OBJECT
            })
            .then(result => {
                countArr = result;
                connection.query(qry, qryOptions, {
                    outFormat: oracledb.OBJECT
                }).then(result => {

                    let parentFilterMap = [];

                    result.forEach(f => {
                        typeCountArr = countArr.filter(r => r.FILTER_ID === f.FILTER_ID)
                        if (typeCountArr.length > 0)
                            f.ASSET_COUNT = typeCountArr[0].CNT;
                        else
                            f.ASSET_COUNT = 0;


                        f.FILTER_IMAGE =  getimagepath(request) + f.FILTER_IMAGE;


                        if (f.FILTER_PARENT_ID == null) {
                            f.CHILD = [];
                            parentFilterMap.push(f);
                        }
                    });


                    result.forEach(f => {
                        parentFilterMap.filter(parent => {
                            if (parent.FILTER_ID == f.FILTER_PARENT_ID) {
                                parent.CHILD.push(f);
                            }
                        })
                    })

                    result.forEach(f => {

                        if (f.CHILD != undefined) {
                            f.CHILD.sort((val1, val2) => {
                                if (val1.FILTER_NAME.toLowerCase() < val2.FILTER_NAME.toLowerCase()) {
                                    return -1;
                                } else if (val1.FILTER_NAME.toLowerCase() > val2.FILTER_NAME.toLowerCase()) {
                                    return 1;
                                } else {
                                    return 0;
                                }
                            })
                        }
                    })

                    resolve(parentFilterMap);
                }).catch(err => {
                    reject(err + "Something went Wrong.We'll be back soon");
                })
            }).catch(err => {
                reject(err + "Something went Wrong.We'll be back soon");
            })
    })
}
exports.getChildTags = (request, filter_parentIds) => {
    //console.log("Inside fetch parent tags");
    const connection = getDb();
    let countArr = [];
    let winstorycountArr = [];
    return new Promise((resolve, reject) => {

        let qryOptions = "";
        filter_parentIds.split(',').filter(id => qryOptions += qryOptions.length > 0 ? ",'" + id + "'" : "'" + id + "'");
        let qry = `select * from ASSET_TAGS where FILTER_PARENT_ID in(` + qryOptions + `) AND FILTER_STATUS in('1')`;
        // console.log(" parent tags -- > "+qry);
        connection.query(`select distinct f.filter_id,count(asset_id) cnt from asset_filter f full outer join 
                            (select m.filter_id,d.asset_id from asset_filter_asset_map m join ASSET_DETAILS d on 
                            (m.asset_id=d.asset_id) where d.ASSET_STATUS='Live') a on (f.filter_id=a.filter_id) group by f.filter_id`, [],
            {
                outFormat: oracledb.OBJECT
            })
            .then(result => {
                countArr = result;
                connection.query(`select distinct f.filter_id,count(WINSTORY_ID) cnt from asset_filter f full outer join 
                            (select m.filter_id,d.WINSTORY_ID from asset_winstory_filter_winstory_map m join ASSET_WINSTORY_DETAILS d on 
                            (m.WINSTORY_ID=d.WINSTORY_ID) where d.WINSTORY_STATUS='Live') a on (f.filter_id=a.filter_id) group by f.filter_id`, [],
                    {
                        outFormat: oracledb.OBJECT
                    })
                    .then(result => {
                        winstorycountArr = result;
                        connection.query(qry, [], {
                            outFormat: oracledb.OBJECT
                        }).then(result => {
                            result.forEach(f => {
                                typeCountArr = countArr.filter(r => r.FILTER_ID === f.FILTER_ID)
                                winstorytypeCountArr = winstorycountArr.filter(r => r.FILTER_ID === f.FILTER_ID)
                                if (typeCountArr.length > 0)
                                    f.ASSET_COUNT = typeCountArr[0].CNT;
                                else
                                    f.ASSET_COUNT = 0;
                                // if (winstorycountArr.length > 0)
                                //     f.WINSTORY_COUNT = winstorytypeCountArr[0].CNT;
                                // else
                                //     f.WINSTORY_COUNT = 0;
                                f.FILTER_IMAGE = getimagepath(request) + f.FILTER_IMAGE;
                            });
                            result.sort((val1, val2) => {
                                if (val1.FILTER_NAME.toLowerCase() < val2.FILTER_NAME.toLowerCase()) {
                                    return -1;
                                } else if (val1.FILTER_NAME.toLowerCase() > val2.FILTER_NAME.toLowerCase()) {
                                    return 1;
                                } else {
                                    return 0;
                                }

                            });
                            resolve(result);
                        }).catch(err => {
                            reject(err + "Something went Wrong.We'll be back soon");
                        })
                    }).catch(err => {
                        reject(err + "Something went Wrong.We'll be back soon");
                    })
            }).catch(err => {
                reject(err + "Something went Wrong.We'll be back soon");
            })
    })
}
exports.getChildTags1 = (host, filter_parentIds) => {
    const connection = getDb();
    return new Promise((resolve, reject) => {
        let qry = `select * from ASSET_TAGS where FILTER_PARENT_ID=:filter_Parent_Id AND FILTER_STATUS in('1')`;
        let qryOptions = [filter_parentIds];
        connection.query(qry, qryOptions, {
            outFormat: oracledb.OBJECT
        }).then(result => {
            result.forEach(f => {
                f.FILTER_IMAGE = getimagepath(request) + f.FILTER_IMAGE;
            });
            resolve(result);
        }).catch(err => {
            reject(err + "Something went Wrong.We'll be back soon")
        })
    })
}


saveTagImage = (host, image, FILTER_TYPE, FILTER_ID, res) => {
    // READ THE IMAGE EXTENSION
    let imageext = image.split(';base64,')[0].split('/')[1];
    let dynamicPath = 'filter';
    // READ THE BASE64 IMAGE DATA FROM THE PAYLOAD
    image = image.split(';base64,').pop();
    console.log('Uploading img');
    let filename = base64.encode(FILTER_ID + FILTER_TYPE) + "." + imageext;
    let foldername = "filter";
    let filelocation = path.join(__dirname, '../../../..', 'mnt/ahfs', '/' + foldername + '/');
    //let filelocation = path.join(__dirname, '/mnt/ahfs', 'private', '/filter/');
    savefileto(image, filelocation + filename).then((data) => {
        const connection = getDb();
        let updateFilterImageSql = '';
        let relativepath = foldername + "/" + filename;
        if (FILTER_ID)
            updateFilterImageSql = "update ASSET_TAGS SET FILTER_IMAGE='" + relativepath + "' where FILTER_ID='" + FILTER_ID + "'";
        console.log(updateFilterImageSql);
        connection.update(updateFilterImageSql, [], {
            autoCommit: true
        }).then(result => {
            if (result.rowsAffected > 0) {
                console.log("Filter Image updated successfully ");
            } else {
                console.log("Could not found Image. . .");
            }
        }).catch(err => {
            console.log("Error occurred while saving Thumbnail image : " + err);
        })
    }).catch(err => {
        console.log("Error while Filter image save " + err);
    })
}

savefileto = (base64Image, filelocation) => {
    console.log("Saving Filter image : " + base64Image.length + " - " + filelocation);
    return new Promise((resolve, reject) => {
        try {
            fs.writeFileSync(filelocation, base64Image, { encoding: 'base64', mode: 0o755 });
            console.log("Image saved");
            resolve("Success");
        } catch (err) {
            console.log("Image save failed : : " + JSON.stringify(err));
        }
    });
}

getimagepath = (request) => {
    return (request.headers.host.toLowerCase().includes(':') ? 'http://' + request.headers.host +"/": 'https://' + request.headers.host +"/image/");
}
exports.addNewTag = (filter, host) => {
    const connection = getDb();
    return new Promise((resolve, reject) => {
        if (filter.child_filter.length > 0) {
            filter.child_filter.forEach(item => {
                let newFilterId = uniqid.process();
                let sql = '';
                let options = '';
                sql = `INSERT into ASSET_TAGS(FILTER_ID,FILTER_NAME,FILTER_PARENT_ID,FILTER_STATUS)  values(:0,:1,:2,:3)`;
                options = [newFilterId, item.filter_name, filter.FILTER_PARENT_ID, 1]

                //let sql1 = 'SELECT TOP 1 ASSET_FILTER.FILTER_NAME, ASSET_FILTER.FILTER_TYPE FROM ASSET_FILTER WHEREASSET_FILTER.FILTER_NAME, ASSET_FILTER.FILTER_TYPE;'
                connection.execute(sql, options,
                    {
                        outFormat: oracledb.Object,
                        autoCommit: true
                    })
                    .then(res => {
                        console.log('tag added');
                        if (item.filter_image.length > 0) {
                            saveTagImage(host, item.filter_image, filter.FILTER_PARENT_ID, newFilterId, res);
                        }
                        resolve({ "status": 'Success', "message": "tag created successfully" });
                    })
                    .catch(err => {
                        console.log("View error: " + err);
                        resolve(err)
                    })
            });
        } else {
            resolve('Please provide filter name');
        }
    })
}
exports.editTagbyId = (filter, host) => {
    const connection = getDb();
    return new Promise((resolve, reject) => {
        console.log("===========   Tag UPDATE ================")
        console.log("Updating Child Filter");
        filter.child_filter.forEach(item => {
            connection.execute(`UPDATE ASSET_TAGS SET FILTER_NAME=:FILTER_NAME,FILTER_PARENT_ID=:FILTER_PARENT_ID, WHERE FILTER_ID=:FILTER_ID`, [item.filter_name, filter.FILTER_PARENT_ID, item.filter_id],
                {
                    outFormat: oracledb.Object,
                    autoCommit: true
                })
                .then(res => {

                    if (item.filter_image.length > 0) {
                        saveTagImage(host, item.filter_image, filter.FILTER_PARENT_ID, item.filter_id, res);
                    }
                    resolve({ "status": 'Success', "message": "Tag updated successfully" })
                })
                .catch(err => {
                    console.log("View error: " + err);
                    resolve(err)
                })
        })

    })
}