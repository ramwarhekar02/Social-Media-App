// const multer = require("multer")
// const path = require("path")
// const crypto = require("crypto")

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//       cb(null, '/public/images/uploads')
//     },
//     filename: function (req, file, cb) {
//       crypto.randomBytes(12, function(err, buffer) { 
//         const fn = buffer.toString("hex") + path.extname(file.originalname);
//         cb(null, fn);
//       })
//     }
//   })
  
// const upload = multer({ storage: storage })

// module.export = upload;

const multer = require('multer');

const path = require('path');



const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public/images/uploads'))
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
});

const upload = multer({ storage: storage });
module.exports = upload;
