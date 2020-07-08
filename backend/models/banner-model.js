const getDb = require('../database/db').getDb;
const oracledb = require('oracledb');
const path = require('path');
const fs = require('fs');
const fileNames = ["",
    "NAC_Consumption_Infographic.pdf",
    "NAC_Buyer_Infographic.pdf",
    "NAC_Consulting_Win_lives.pdf",
    "Top_10_Accounts_by_LOB.pptx",
    "Customer_Ready.pdf",
    "Reference_Information.pdf",
    "Resource_Information.pdf"
]


exports.getBannerLinks = () => {
    return new Promise((resolve, reject) => {
        const connection = getDb();
        try {
            connection.query(`select * from ASSET_BANNER order by banner_id`, {}, {
                outFormat: oracledb.Object
            }).then(result => {
                resolve(result);
            })
        } catch (error) {
            reject({ msg: "Couldn't find any data" });
        }

    })
}

exports.uploadBannerDoc = (req) => {

    return new Promise((resolve, reject) => {
        if (req.files) {
            let file = req.files.file;
            let bannerContentId = req.params.id;
            console.log("Id:    ---> " + bannerContentId);
            console.log("Name   ---> " + JSON.stringify(fileNames[bannerContentId]));
            console.log("Length ---> " + file.size);

            // let fname = file.name.replace(/ /g, '');
            // fname = fname.replace(/ /g, '');
            // const ftype = file.name.split('.')[1];
            // const uniqueId = uniqid();
            const finalFname = fileNames[bannerContentId]//bannerContentId + "." + file.name.split('.')[1];// + uniqueId.concat('.', ftype);
            const uploadPath = path.join('/', 'mnt/ahfs/guide', finalFname);
            var content = 'http://' + req.headers.host + '/' + 'guide/' + finalFname;
            console.log(uploadPath);

            console.log("---------  Banner Content Path ----------")
            const baseresoursePath = path.join('/', 'mnt/ahfs/guide');
            console.log("projected path " + baseresoursePath);

            try {

                fs.open(baseresoursePath, 'r', (err) => {
                    if (err) {
                        if (err.code === 'ENOENT') {
                            console.log('folder does not exist');

                            if (!fs.existsSync(baseresoursePath)) {
                                fs.mkdirSync(baseresoursePath);
                                console.log("Calling file create " + uploadPath);
                                file.mv(uploadPath, function (err) {
                                    if (err) {
                                        console.log(JSON.stringify(err));
                                        return res.status(500).send(err);
                                    }
                                })
                            }

                        }
                    } else {
                        console.log("Calling file create " + uploadPath);
                        file.mv(uploadPath, function (err) {
                            if (err) {
                                console.log(JSON.stringify(err));
                                return res.status(500).send(err);
                            }
                        })
                    }
                });

            } catch (err) {
                console.log("Folder creation failed " + err.message);
            }
            try {
                const connection = getDb();
                connection.update(`update asset_banner set banner_url=:url,BANNER_MODIFIEDON=:updatedon where banner_id=:bannerContentId`, [content, new Date(), bannerContentId],
                    {
                        outFormat: oracledb.Object,
                        autoCommit: true
                    }).then(res => {
                        console.log(JSON.stringify(res));
                        console.log("Banner uploaded Successfully")
                        resolve({ msg: "Banner content uploaded Successfully" });
                    }).catch(err => {
                        console.log("Error : " + err.message);
                        reject({ msg: "error uploading banner image # " + err.message });
                    })
            } catch (error) {
                console.log(JSON.stringify(error));
                reject({ msg: "error uploading banner image # " + error });
            }

        } else {
            console.log("No file available");
            reject({ msg: "Upload content failed" });
        }
    })

}