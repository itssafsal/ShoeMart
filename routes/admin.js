var express = require('express');
var router = express.Router();
var fs= require("fs")
var productHelpers = require('../Helpers/product-helpers');
const { log } = require('console');

/* GET users listing. */
const verifyAdminLogin=function(req,res,next){
  if(req.session.adminLoggedIn){
    next()
  }else{
    res.redirect('/admin/login')
  }
}

router.get('/',verifyAdminLogin, function (req, res, next) {
  productHelpers.getAllProduct().then(function (products) {
    admins=req.session.admin
    res.render('admin/dashbord', { admin: true, products,admins })
  })
});

router.get('/view-products',verifyAdminLogin, function (req, res, next) {
  productHelpers.getAllProduct().then(function (products) {
    console.log(products);
    admins=req.session.admin
    if(products){
      for(i=0;i<products.length;i++){
        products[i].imageqty=products[i].image.length
      }
    }
    res.render('admin/view-products', { admin: true, products,admins})
  })
});


router.get('/add-products',verifyAdminLogin, function (req, res) {
  admins=req.session.admin
  res.render('admin/add-products', { admin: true,admins })
})

router.post('/add-products',verifyAdminLogin,function (req, res) {
  productHelpers.addProduct(req.body, req.files.Image.length,  function (id) {
    let image = req.files.Image
  console.log(id);
  let i=0
  if(image.length>0){
    for(i=0;i<image.length;i++){
      image[i].mv('./public/product-images/' +id+i+ '.jpg', function () {
      
      })
    }
  }else{
    image.mv('./public/product-images/' + id+i+ '.jpg', function () {
    })
  }
      res.redirect('/admin/add-products')
  })
})

router.get('/delete-product',verifyAdminLogin, function (req, res) {
  let productId = req.query.id
  let image=req.query.image
  productHelpers.deleteProduct(productId).then(function () {
      let i=0
  if(image>0){
    for(i=0;i<image;i++){
      fs.rm('./public/product-images/' + productId +i+ '.jpg', function () {
      })
    }
  }else{
    fs.rm('./public/product-images/' + productId +i+ '.jpg', function () {
    })
  }
  res.redirect('/admin/view-products')
  })
})

router.get('/edit-product',verifyAdminLogin, function (req, res) {
  let productId = req.query.id
  productHelpers.getProductDetails(productId).then(function (product) {
    admins=req.session.admin
    res.render('admin/edit-product', { product, admin: true,admins })
  })

})

router.post('/edit-product', function (req, res) {

  productHelpers.updateProduct(req.body, req.query.id).then(function () {
    res.redirect('/admin')
    let id = req.query.id
    
    if (req.files) {
      let image = req.files.Image
      let i=0
      if(image.length>0){
        for(i=0;i<image.length;i++){
          image[i].mv('./public/product-images/' +id+i+ '.jpg', function () {
          })
        }
      }else{
        image[i].mv('./public/product-images/' +id+i+ '.jpg', function () {
        })
      }
    }
  })

})

router.get('/all-orders',verifyAdminLogin,async function(req,res){
  let placedOrders=await productHelpers.getPlacedOrders()
  let i=0
  if(placedOrders.length>0){
    for(i=0;i<placedOrders.length;i++){
      if(placedOrders[i].status=='Shipped'){
        placedOrders[i].shipped=true
      }
    }
  }
  admins=req.session.admin 
  res.render('admin/all-orders',{admin:true,placedOrders,admins})
})

router.get('/order-details',verifyAdminLogin,async function(req,res){
  let orderDetail=await productHelpers.getOrderDetails(req.query.orderId)
  console.log(orderDetail);
  admins=req.session.admin
  res.render('admin/order-details',{admin:true,orderDetail,admins})
})

router.get('/delivered-orders',verifyAdminLogin,async function(req,res){
  let deliverdeOrders=await productHelpers.getDeliveredOrders()
  admins=req.session.admin
  res.render('admin/delivered-orders',{admin:true,admins,deliverdeOrders})
})

router.get('/change-order-status',function(req,res){
  console.log(req.query)
    productHelpers.changeStatus(req.query.id,req.query.value).then(function(){
      res.redirect('/admin/all-orders')
    })
})

router.get('/all-users',verifyAdminLogin,async function(req,res){
 let allUsers=await productHelpers.getAllUsers()
 admins=req.session.admin
 res.render('admin/all-users',{allUsers,admin:true,admins})
})

router.get('/all-admin',verifyAdminLogin,function(req,res){
  productHelpers.getAlladmins().then(function(allAdmins){
    console.log(allAdmins);
    admins=req.session.admin
    res.render('admin/all-admin',{admin:true,admins,allAdmins})
  })
})

router.get('/add-admin',verifyAdminLogin,function(req,res){
  admins=req.session.admin
  res.render('admin/add-admin',{admin:true,admins})
})

router.post('/add-admin',verifyAdminLogin,function(req,res){
  productHelpers.addAdmin(req.body).then(function(){
    res.redirect('/admin/add-admin')
  })
})

router.get('/login',function(req,res){
  if(req.session.adminLoggedIn){
    res.redirect('/admin',)
  }else{
     res.render('admin/login',{adminLoginErr:req.session.adminLoginErr})
     req.session.adminLoginErr=false
  }
})

router.post('/login',function(req,res){
  productHelpers.adminLogin(req.body).then(function(response){
    if(response.status){
      req.session.adminLoggedIn=true
      req.session.admin=response.admin
      console.log(req.session.admin)
      res.redirect('/admin')
    }else{
      req.session.adminLoginErr=response
      res.redirect('/admin/login')
    }
  })
})

router.get('/userblock',function(req,res){
  console.log('fetched');
  console.log(req.query);
  productHelpers.userActions(req.query.userId).then(function(status){
    console.log(status);
    res.json(status)
  })
})

router.get('/adminblock',function(req,res){
  console.log(req.query);
  productHelpers.adminAction(req.query.adminId).then(function(status){
    res.json(status)
  })
})

router.get('/logout',function(req,res){
  req.session.adminLoggedIn=false
  req.session.admin=false
  res.redirect('/admin/login')
})
module.exports = router;
