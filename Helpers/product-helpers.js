var db=require("../config/connecion_db")
var collections=require('../config/collections')
var bcrypt = require('bcryptjs')
const { response } = require("express")
var objecId=require('mongodb').ObjectId
module.exports={
    // with promise
    // addProduct:async function(product){
    //     return new Promise(async function(resolve,reject){
    //       var data=await db.get().collection('Products').insertOne(product)
    //       console.log(data)  
    //       resolve(data.insertedId)
    //     })
    addProduct:function(product,image,Callback){
        product.Price=parseInt(product.Price)
        let images=[]
          db.get().collection(collections.PRODUCT_COLLECTION).insertOne(product).then(function(data){
            for(i=0;i<image;i++){
                images.push(data.insertedId+i)
            }
            db.get().collection(collections.PRODUCT_COLLECTION).updateOne({_id:new objecId(data.insertedId)},{
                $set:{image:images}
            })
            Callback(data.insertedId)
        })
        
    },
   // using call back 
    // getAllProducts: function(Callback){
    //      db.get().collection(collections.PRODUCT_COLLECTION).find().toArray().then(function(data){
    //         console.log(data)
    //         console.log('callback')
    //         Callback(data)
    //     })
    // } 

    getAllProduct:function(){
        return new Promise(async function(resolve,reject){
            var products=await db.get().collection(collections.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },

    getAllProductsForHome:function(){
        return new Promise(async function(resolve,reject){
            var products=await db.get().collection(collections.PRODUCT_COLLECTION).find().limit(6).toArray()
            resolve(products)
        })
    },

    getPriceFilterProducts:function(priceFilter){
        return new Promise(async function(resolve,reject){
           let products=await db.get().collection(collections.PRODUCT_COLLECTION).find().sort({Price:priceFilter}).toArray()
            resolve(products)
            console.log(products);
        })
    },

    getSearchedProducts:function(searchData){
        searchData=searchData.toLowerCase()
        return new Promise(async function(resolve,reject){
            let products=await db.get().collection(collections.PRODUCT_COLLECTION).find().toArray()
            let searchProduct=[]
            products.forEach((item,index) => {
                let items=item.Name.toLowerCase()
                if(items.includes(searchData)){
                    searchProduct.push(item)
                }
            });
            resolve(searchProduct)
        })
    },

    deleteProduct:function(productId){
        return new Promise(function(resolve,reject){
            db.get().collection(collections.PRODUCT_COLLECTION).deleteOne({_id:new objecId(productId)}).then(function(data){
                console.log(data)
                resolve(data)
            })
        })
    },

    getProductDetails:function(productId){
        console.log(productId);
        return new Promise(function(resolve,reject){
            db.get().collection(collections.PRODUCT_COLLECTION).findOne({_id:new objecId(productId)}).then(function(response){
                resolve(response)
            })
        })
    },

    updateProduct:function(productDetails,productId){
        return new Promise(function(resolve,reject){
            db.get().collection(collections.PRODUCT_COLLECTION).updateOne({_id:new objecId(productId)},{
                $set:{
                    Name:productDetails.Name,
                    Category:productDetails.Category,
                    Price:parseInt(productDetails.Price),
                    Description:productDetails.Description,
                    Stock:productDetails.Stock
                }
            }).then(function(response){
                resolve(response)
            })
        })
    },

    getPlacedOrders:function(){
        return new Promise(async function(resolve,reject){
            let placedOrders=await db.get().collection(collections.ORDER_COLLECTION).find({
                $or: [
                    {
                      status: "Placed"
                    },
                    {
                      status: "Shipped"
                    }
                  ]
            }).toArray()
           console.log(placedOrders)
            resolve(placedOrders)
        })
    },
    getDeliveredOrders:function(){
        return new Promise(async function(resolve,reject){
            let deliveredOrders=await db.get().collection(collections.ORDER_COLLECTION).find({status:'Delivered'}).toArray()
            resolve(deliveredOrders)
        })
    },

    getOrderDetails:function(orderId){
        return new Promise(async function(resolve,reject){
            let orderDetails=await db.get().collection(collections.ORDER_COLLECTION).findOne({_id:new objecId(orderId)})
            resolve(orderDetails)
        })
    },
    
    changeStatus:function(orderId,value){
        return new Promise(function(resolve,reject){
            db.get().collection(collections.ORDER_COLLECTION).updateOne({_id:new objecId(orderId)},
            {
                $set:{status:value}
            }).then(function(){
                resolve()
            })
        })
    },

    getAllUsers:function(){
        return new Promise(async function(resolve,reject){
            let users=await db.get().collection(collections.USER_COLLECTION).aggregate([
                {
                    $project:{
                        _id:1,
                        fname:1,
                        lname:1,
                        email:1,
                        mobile:1,
                        status:1
                    }
                }
            ]).toArray()
            // .find().toArray()
            resolve(users)
        })
    },

    adminLogin:function(adminData){
        return new Promise(async function(resolve,reject){
            let response={}
            let admin=await db.get().collection(collections.ADMIN_COLLECTION).findOne({email:adminData.email})
            if(admin){
                bcrypt.compare(adminData.password,admin.password).then(function(data){
                   if(data){ 
                    if(admin.status){
                        console.log('correct')
                    response.admin=admin
                    response.status=true
                    resolve(response)
                    }else{
                        resolve('Admin Blocked your Account')
                    }
                   }else{
                    resolve('invalid Email or Password')
                    console.log('incorrect password')
                   }

                })
            }else{
                console.log('incorrect email')
                resolve('invalid Email or Password')
            }
        })
    },

    addAdmin:function(adminData){
        return new Promise(async function(resolve,reject){
        let admin=await db.get().collection(collections.ADMIN_COLLECTION).findOne({email:adminData.email})
        if(admin){
            reject()
        }else{
            adminData.password=await bcrypt.hash(adminData.password,10)
            adminData.status=true
            adminData.superadmin=false
            db.get().collection(collections.ADMIN_COLLECTION).insertOne(adminData).then(function(){
                resolve()
            })
        }
        })
    },

    userActions:function(userId){
        console.log(userId);
        return new Promise(async function(resolve,reject){
            let userData=await db.get().collection(collections.USER_COLLECTION).findOne({_id:new objecId(userId)})
            if(userData.status){
                db.get().collection(collections.USER_COLLECTION).updateOne({_id:new objecId(userId)},{
                    $set:{status:false}
                }).then(function(){
                    resolve({status:"blocked"})
                })
            }else{
                db.get().collection(collections.USER_COLLECTION).updateOne({_id:new objecId(userId)},{
                    $set:{status:true}
                }).then(function(){
                    resolve({status:"unblocked"})
                })
            }
            console.log(userData);
        })
    },

    adminAction:function(adminId){
       return new Promise(async function(resolve,reject){
        let admin=await db.get().collection(collections.ADMIN_COLLECTION).findOne({_id:new objecId(adminId)})
        if(admin.status){
            db.get().collection(collections.ADMIN_COLLECTION).updateOne({_id:new objecId(adminId)},{
                $set:{status:false}
            }).then(function(){
                resolve({status:'blocked'})
            })
        }else{
            db.get().collection(collections.ADMIN_COLLECTION).updateOne({_id:new objecId(adminId)},{
                $set:{status:true}
            }).then(function(){
                resolve({status:'unblocked'})
            })
        }
       }) 
    },

    getAlladmins:function(){
        return new Promise(async function(resolve,reject){
            let allAdmins=await db.get().collection(collections.ADMIN_COLLECTION).find({superadmin:false}).toArray()
            console.log(allAdmins);
            resolve(allAdmins)
        })
    }

    }
