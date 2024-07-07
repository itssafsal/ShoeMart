var db = require("../config/connecion_db")
var collections = require('../config/collections')
var bcrypt = require('bcryptjs')
let objecId = require('mongodb').ObjectId
var Razorpay = require('razorpay')
var otpGenerator=require('otp-generator')
const { log } = require("node:console")
const { resolve } = require("node:path")
const{validateName,validatePassword,validatePhoneNumber}=require('../public/javascripts/validation')
const {sendmail}=require('../public/javascripts/otp-nodemailer')
var instance = new Razorpay({
    key_id: 'rzp_test_McMTGZIhY3yoIi',
    key_secret: 'uL02MeSY09p1HcOPw9p5LZe6',
});
module.exports = {

    signupotp: function(userData){
        return new Promise(async function(resolve,reject){
            if(!validateName(userData.fname)){
                reject({name:true})
            }else if(!validatePhoneNumber(userData.mobile)){
                reject({mobile:true})
            }else if(!validatePassword(userData.password)){
                reject({password:true})
            }else{
                let name = await db.get().collection(collections.USER_COLLECTION).findOne({ fname: userData.fname })
                let email = await db.get().collection(collections.USER_COLLECTION).findOne({ email: userData.email })
                if (name || email) {
                    reject()
                }else{

                let otp=otpGenerator.generate(6,{
                    upperCaseAlphabets:false,
                    specialChars:false,
                    lowerCaseAlphabets:false

                })
                  sendmail(userData.fname,userData.email,otp)
                  resolve(otp) 
                }
        } 
        })
    },

    resetOtp:function(userData){
        return new Promise(function(resolve,reject){
            let otp=otpGenerator.generate(6,{
                upperCaseAlphabets:false,
                specialChars:false,
                lowerCaseAlphabets:false

            })
            sendmail(userData.fname,userData.email,otp)
            resolve(otp) 
        })
    },

    doSignup: function (userData,oldotp,oldotpTime,newotp) {
        return new Promise(async function (resolve, reject) {  
            let newtime=new Date().getTime()    
                let timeDifference=newtime-oldotpTime
                if(timeDifference<=120000){
                    if(newotp==oldotp){
                           userData.password = await bcrypt.hash(userData.password, 10)
                    userData.status=true
                    db.get().collection(collections.USER_COLLECTION).insertOne(userData).then(function (data) {
                        resolve(userData)
                    })
                    }else{
                        reject('invalid Otp')
                    }
                }else{
                    reject('Time Expired')
                }
        })

    },
    doLogin: function (userData) {
        return new Promise(async function (resolve, reject) {
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(collections.USER_COLLECTION).findOne({ email: userData.email })
            if (user) {
                console.log(user.status);
                    bcrypt.compare(userData.password, user.password).then(function (data) {
                        if (data) {
                            if(user.status){
                                console.log('correct')
                                response.user = user
                                response.status = true
                                resolve(response)
                            }else{
                                resolve(message="Admin blocked your account")
                            }
                        }
                        else {
                            console.log('incorrect Paasword')
                            resolve(message='Invalid Username or Password')
                        }
                    })
            } else {
                console.log('incorrect Email')
                resolve(message='Invalid Username or Password')

            }
        })


    },
    
    addToCart: function (productId, userId) {
        productObj = {
            item: new objecId(productId),
            quantity: 1
        }
        return new Promise(async function (resolve, reject) {
            let userCart = await db.get().collection(collections.CART_COLLECTION).findOne({ user: new objecId(userId) })
            if (userCart) {
                let productExist = await userCart.products.findIndex(product => product.item == productId)

                if (productExist != -1) {
                    db.get().collection(collections.CART_COLLECTION).updateOne({ user: new objecId(userId), 'products.item': new objecId(productId) },
                        {
                            $inc: { 'products.$.quantity': 1 }
                        }
                    ).then(function () {
                        resolve({exist:true})
                    })
                } else {
                    db.get().collection(collections.CART_COLLECTION).updateOne({ user: new objecId(userId) },
                        {
                            $push: { products: productObj }
                        }
                    ).then(function () {
                        resolve()
                    })
                }
            } else {
                cartObj = {
                    user: new objecId(userId),
                    products: [productObj]
                }
                db.get().collection(collections.CART_COLLECTION).insertOne(cartObj).then(function (response) {
                    resolve()
                })
            }
        })
    },

    getCartProducts: function (userId) {
        return new Promise(async function (resolve, reject) {
            let CartItems = await db.get().collection(collections.CART_COLLECTION).aggregate([
                {
                    $match: { user: new objecId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collections.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'productDetails'
                    }
                },
                {
                    $project:{
                        _id:1,
                        item:1,
                        quantity:1,
                        product:{$arrayElemAt:['$productDetails',0]}
                    }
                },
                {
                    $project:{
                        _id:1,
                        item:1,
                        quantity:1,
                        product:1,
                        total: { $sum: { $multiply: ['$quantity', '$product.Price'] } }
                    }
                }

            ]).toArray()
            console.log(CartItems);
            resolve(CartItems)
        })
    },

    getCartCount: function (userId) {
        return new Promise(async function (resolve, reject) {

            let count = null
            let user = await db.get().collection(collections.CART_COLLECTION).findOne({ user: new objecId(userId) })
            if (user) {
                count = user.products.length
                resolve(count)
            } else {
                resolve()
            }
        })

    },
    changeProductQuantity: function (cartData) {
        let quantity = parseInt(cartData.quantity)
        let count = parseInt(cartData.count)
        return new Promise(function (resolve, reject) {
          if(count==1 && quantity>=3){
                resolve({limitExceed:true})
          }else if (count == -1 && quantity == 1) {
                db.get().collection(collections.CART_COLLECTION).updateOne({ _id: new objecId(cartData.cart) },
                    {
                        $pull: { products: { item: new objecId(cartData.product) } }
                    }).then(function () {
                        resolve({ removeProduct: true })
                    })
            } else {
                db.get().collection(collections.CART_COLLECTION).updateOne({ _id: new objecId(cartData.cart), 'products.item': new objecId(cartData.product) },
                    {
                        $inc: { 'products.$.quantity': count }
                    }).then(function () {
                        resolve({ status: true })
                    })
            }
        })
    },
    getTotalAmount: function (userId) {
        return new Promise(async function (resolve, reject) {
            let total = await db.get().collection(collections.CART_COLLECTION).aggregate([

                {
                    $match: { user: new objecId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collections.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'productDetails'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: {
                            $arrayElemAt: ['$productDetails', 0]
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', '$product.Price'] } }
                    }
                }
            ]).toArray()
            console.log(total)
            if (total[0]) {
                resolve(total[0].total)
            } else {
                resolve(null)
            }
 
        })
    },
    romoveCartProducts: function (cartData) {
        return new Promise(function (resolve, reject) {
            db.get().collection(collections.CART_COLLECTION).updateOne({ _id: new objecId(cartData.cartId) },
                {
                    $pull: { products: { item: new objecId(cartData.productId) } }
                }).then(function () {
                    resolve()
                })
        })
    },
    placeOrder: function (orderData, products, total,address) {
        return new Promise(function (resolve, reject) {
            const orderId=otpGenerator.generate(16,{
                upperCaseAlphabets:false,
                specialChars:false,
                lowerCaseAlphabets:false
               })
            let date=new Date()
            date=date.toDateString()
            let status = 'Placed'
            
            orderObj = {
                userId: new objecId(orderData.userId),
                orderId:orderId,
                date:date,
                deliveryDetails: {
                    name:address.Name,
                    House_Name: address.House_Name,
                    street:address.Street,
                    City:address.City,
                    state:address.State,
                    pincode: address.Pin_Code,
                    mobile: address.Mobile
                },
                products,
                'payment-method': orderData['Payment-method'],
                totalAmount: total,
                status: status
            }
            db.get().collection(collections.ORDER_COLLECTION).insertOne(orderObj).then(function (response) {
                db.get().collection(collections.CART_COLLECTION).deleteOne({ user: new objecId(orderData.userId) }).then(function () {
                   console.log('orderdate'+date)
                   console.log(response);
                   let data={}
                   data.orderId=response.insertedId
                    resolve(data)
                })
            })
        })
    },
    getCartProductList: function (userId) {
        return new Promise(async function (resolve, reject) {
            let cart = await db.get().collection(collections.CART_COLLECTION).aggregate([
                {
                    $match: { user: new objecId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $lookup: {
                        from: collections.PRODUCT_COLLECTION,
                        localField: 'products.item',
                        foreignField: '_id',
                        as: 'productDetails'
                    }
                },
                {
                    $unwind: '$productDetails'
                },
                { $project: {_id:0, products: { $mergeObjects: [ "$products", "$productDetails" ] } } }


            ]).toArray()
            console.log(cart[0].products);
            resolve(cart)

        })
    },
    getOrderList: function (userId) {
        return new Promise(async function (resolve, reject) {
            let orderList = await db.get().collection(collections.ORDER_COLLECTION).find({userId:new objecId(userId)}).toArray()
            console.log(orderList);
            resolve(orderList)
        })
    },
    getOrderProduct: function (orderId) {
        console.log(orderId)
        return new Promise(async function (resolve, reject) {
            let orderItems = await db.get().collection(collections.ORDER_COLLECTION).findOne({_id:new objecId(orderId.orderId)})
            console.log(orderItems)
            resolve(orderItems)
        })
    },
    generateRazorpay: function (totalAmount) {
         const orderId=otpGenerator.generate(16,{
                upperCaseAlphabets:false,
                specialChars:false,
                lowerCaseAlphabets:false
               })
        return new Promise(function (resolve, reject) {
            instance.orders.create({
                amount: totalAmount *100,
                currency: "INR",
                receipt: orderId,
                notes: {
                    key1: "value3",
                    key2: "value2"
                }
            }).then(function (response) {
                console.log(response)
                resolve(response)
            })
        })

    },
    verifyPayment: function (paymentDetails) {
        return new Promise(function (resolve, reject) {
            const {
                createHmac,
            } = require('node:crypto');
            let hmac = createHmac('sha256', 'uL02MeSY09p1HcOPw9p5LZe6');
            hmac.update(paymentDetails['payment[razorpay_order_id]']+'|'+paymentDetails['payment[razorpay_payment_id]']);
            hmac= hmac.digest('hex')
            if(hmac==paymentDetails['payment[razorpay_signature]']){
                resolve()
            }else{
                reject()
            }
        })
    },
    changePaymentStatus:function(orderId){
        return new Promise(function(resolve,reject){
            db.get().collection(collections.ORDER_COLLECTION).updateOne({_id:new objecId(orderId)},
            {
                $set:{status:'placed'}
            }
            ).then(function(){
                resolve()
            })
        })
    },
    getProductDetail:function(productId){
        console.log(productId);
        return new Promise(function(resolve,reject){
            db.get().collection(collections.PRODUCT_COLLECTION).findOne({_id:new objecId(productId)}).then(function(response){
                resolve(response)
            })
            })
    },

    getProductsByCategory:function(category){
        return new Promise(async function(resolve,reject){
            let products=await db.get().collection(collections.PRODUCT_COLLECTION).find({Category:category}).toArray()
            resolve(products)
        })
    },

    getPriceFilterCategoryProfuct:function(category,priceFilter){
        return new Promise(async function(resolve,reject){
            let products=await db.get().collection(collections.PRODUCT_COLLECTION).find({Category:category}).sort({Price:priceFilter}).toArray()
            resolve(products)
        })
    },

    addToWishlist:function(productId,userId){
        console.log(productId);
        console.log(userId);
        let productObj={
            item:new objecId(productId)
        }
        let wishlistObj={
            user:new objecId(userId),
            products:[productObj]
        }
        return new Promise(async function(resolve,reject){
            let wishlist=await db.get().collection(collections.WISHLIST_COLLECTION).findOne({user:new objecId(userId)})
            console.log(wishlist);
            if(wishlist){
                let productExist=await wishlist.products.findIndex(product=> product.item==productId)
                if(productExist != -1){
                    resolve(exist=true)
                }else{
                    db.get().collection(collections.WISHLIST_COLLECTION).updateOne({user:new objecId(userId)},{
                        $push:{products:productObj}
                    }).then(function(){
                        resolve()
                    })
                }
            }else{
                db.get().collection(collections.WISHLIST_COLLECTION).insertOne(wishlistObj).then(function(){
                    resolve()
                   }) 
            }
       
        })
    },
    getWishlistProduct:function(userId){
        console.log(userId);
        return new Promise(async function(resolve,reject){
           let WishlistProduct=await db.get().collection(collections.WISHLIST_COLLECTION).aggregate([
                {
                    $match:{user:new objecId(userId)}    
                },{
                    $unwind:'$products'
                },{
                    $project:{item:'$products.item'}
                },{
                    $lookup:{
                        from: collections.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'productDetails'
                    }
                }
            ]).toArray()
            console.log(WishlistProduct);
            resolve(WishlistProduct)
        })
    },
    removeWishlistProduct:function(wishlistData){
        return new Promise(function(resolve,reject){
        db.get().collection(collections.WISHLIST_COLLECTION).updateOne({_id:new objecId(wishlistData.wishlistId)},{
            $pull:{products:{item:new objecId(wishlistData.productId)}}
        }).then(function(){
            resolve()
        })
        })
    },

    getUserDetails:function(userId){
        console.log(userId);
        return new Promise(async function(resolve,reject){
           let userData= await db.get().collection(collections.USER_COLLECTION).findOne({_id:new objecId(userId)})
            console.log(userData);  
            resolve(userData)
        })
    },

    updateUserDetails:function(userId,userData){
        return new Promise(function(resolve,reject){
            if(!validateName(userData.fname)){
                reject()
            }else if(!validatePhoneNumber(userData.mobile)){
                reject()
            }else{
                db.get().collection(collections.USER_COLLECTION).updateOne({_id:new objecId(userId)},
                {
                    $set:{
                        fname:userData.fname,
                        lname:userData.lname,
                        email:userData.email,
                        mobile:userData.mobile
                    }
                }).then(function(){
                    resolve()
                })
            }
        })
    },

    addAddress:function(userId,addressData){
       let addressObj={
        userId:new objecId(userId),
        address:[addressData]
       }
       return new Promise(async function(resolve,reject){
        let address= await db.get().collection(collections.ADDRESS_COLLECTION).findOne({userId:new objecId(userId)})
        if(address){
            db.get().collection(collections.ADDRESS_COLLECTION).updateOne({userId:new objecId(userId)},
            {
                $push:{address:addressData}
            }
        ).then(function(){
                resolve()
            })
        }else{
            console.log('adrs');
            db.get().collection(collections.ADDRESS_COLLECTION).insertOne(addressObj).then(function(){
                resolve()
            })
        }
       })
    },

    getUserAddress:function(userId){
        return new Promise(async function(resolve,reject){
            let addressData=await db.get().collection(collections.ADDRESS_COLLECTION).findOne({userId:new objecId(userId)})
            resolve(addressData)
        })
    },

    deleteAddress:function(userId,id){
        return new Promise(async function(resolve,reject){
                let userAddress=await db.get().collection(collections.ADDRESS_COLLECTION).findOne({userId:new objecId(userId)})
                const addressData = userAddress.address[id]
                db.get().collection(collections.ADDRESS_COLLECTION).updateOne({userId:new objecId(userId)},{
                    $pull : {address : addressData }
                }).then(function(){
                   resolve()
                })  
        })
    },

    getWishlistCount:function(userId){
        return new Promise(async function(resolve,reject){
            let count=null
            let wishlist=await db.get().collection(collections.WISHLIST_COLLECTION).findOne({user:new objecId(userId)})
            if(wishlist){
                resolve(wishlist.products.length)
            }else{
                resolve()
            }
        })
    },

    updateAddress:function(userId,addressData){
        console.log(addressData)
        let id=addressData.id
        return new Promise(function(resolve,reject){
            db.get().collection(collections.ADDRESS_COLLECTION).updateOne({userId:new objecId(userId),},{
                $set:{
                    [`address.${id}.Save_as`]:addressData.Save_as,
                    [`address.${id}.Name`]:addressData.Name,
                    [`address.${id}.House_Name`]:addressData.House_Name,
                    [`address.${id}.Street`]:addressData.Street,
                    [`address.${id}.City`]:addressData.City,
                    [`address.${id}.State`]:addressData.State,
                    [`address.${id}.Pin_Code`]:addressData.Pin_Code,
                    [`address.${id}.Mobile`]:addressData.Mobile

                }
            }).then(function(){
                resolve()
            })
        })
        
    },

    changePassword:function(paswordData,userId){
        console.log(userId);
        return new Promise(async function(resolve,reject){
        let userData=await db.get().collection(collections.USER_COLLECTION).findOne({_id:new objecId(userId)})
        bcrypt.compare(paswordData.currentpaasword,userData.password).then(async function(data){
            if(data){
                if(!validatePassword(paswordData.newpassword)){
                    reject({validation:true})
                }else{
                    paswordData.newpassword=await bcrypt.hash(paswordData.newpassword,10)
                    db.get().collection(collections.USER_COLLECTION).updateOne({_id:new objecId(userId)},{
                        $set:{
                            password:paswordData.newpassword
                        }
                    }).then(function(){
                    resolve() 
                    })
                }
            }else{
                reject({currentpsrd:true})
            }
        })
        console.log(userData);
        })
    },

    getAddress:function(address,userId){
        return new Promise(async function(resolve,reject){
           
                let addressDetails=await db.get().collection(collections.USER_COLLECTION).findOne({_id:new objecId(userId)})
            
            if (address=='address1') {
                resolve(addressDetails.address1[0])
            }else{
                resolve(addressDetails.address2[0])
            }
        })
    }

}