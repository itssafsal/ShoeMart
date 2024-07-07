var express = require('express');
var router = express.Router();
var productHelpers=require('../Helpers/product-helpers')
var userHelpers=require('../Helpers/user-helpers');
var Swal=require('sweetalert2');

// miidleware
const verifyLogin=function(req,res,next){
  if(req.session.userLoggedIn){
    next()
  }else{
    res.redirect('/login')
  }
}

/* GET home page. */
router.get('/', function(req, res, next) {
  
  productHelpers.getAllProductsForHome().then(async function(products){
    
    let user=req.session.user
    let cartCount=null
    let wishlistCount=null
    if(req.session.user){
      cartCount=await userHelpers.getCartCount(req.session.user._id)
      wishlistCount=await userHelpers.getWishlistCount(req.session.user._id)
    }
    console.log(products)
    res.render('user/view-products', {products,user,cartCount,wishlistCount,home:true});

  })
});

router.get('/newarrival',async function(req,res){
  let user=req.session.user
  let products=await productHelpers.getAllProduct()
  let cartCount=null
  let wishlistCount=null
  if(req.session.user){
    cartCount=await userHelpers.getCartCount(req.session.user._id)
    wishlistCount=await userHelpers.getWishlistCount(req.session.user._id)
  }
  res.render('user/shop',{products,user,cartCount,wishlistCount,shop:true})
})

router.get('/pricefilter',async function(req,res){
  let user=req.session.user
  let cartCount=null
  let wishlistCount=null
  let price=req.query.price
  let products=await productHelpers.getPriceFilterProducts(price)
  if(req.session.user){
    cartCount=await userHelpers.getCartCount(req.session.user._id)
    wishlistCount=await userHelpers.getWishlistCount(req.session.user._id)
  }
  res.render('user/shop',{products,user,cartCount,wishlistCount,shop:true})
})

router.get('/login',function(req,res){
  if(req.session.userLoggedIn){
    res.redirect('/')
  }else{
  res.render('user/login',{loginErr:req.session.loginErr})
  req.session.loginErr=false
  }
})

router.post('/login',function(req,res){
  userHelpers.doLogin(req.body).then(function(response){
    if(response.status){
      req.session.userLoggedIn=true
      req.session.user=response.user
     res.redirect('/')
    }else{
      req.session.loginErr=response
      res.redirect('/login')
    }
    
  })
})

router.get('/signup',function(req,res){
  if(req.session.userLoggedIn){
    res.redirect('/')
  }else{
    res.render('user/signup',{signupErr:req.session.signupErr,validationErr:req.session.validationErr})
    req.session.signupErr=false
    req.session.validationErr=false
  }
 
})

router.post('/signup',async function(req,res){
  userHelpers.signupotp(req.body).then(function(otp){
    let otpgeneratetime=new Date().getTime()
    req.session.otp=otp
    req.session.otpTime=otpgeneratetime
    req.session.userData=req.body
    console.log(otp);
  res.redirect('/signupotp')
  }).catch(function(response){
    if(response){
      console.log(response);
      req.session.validationErr=response
      res.redirect('/signup')
    }else{
      req.session.signupErr='use another name or email'
      res.redirect('/signup')
      }
  })
})

router.get('/signupotp',function(req,res){
    res.render('user/signupotp',{otpErr:req.session.otpErr})
    req.session.otpErr=false
})

router.get('/resetotp',function(req,res){
    let userData=req.session.userData
    userHelpers.resetOtp(userData).then(function(otp){
    let otpgeneratetime=new Date().getTime()
    req.session.otpTime=otpgeneratetime
    req.session.otp=otp
    res.redirect('/signupotp')
    })
    console.log(userData); 
})

router.post('/signupotp',function(req,res){
  let userData=req.session.userData
  let oldotp=req.session.otp
  let oldotpTime=req.session.otpTime
  let newotp=req.body.otp
  userHelpers.doSignup(userData,oldotp,oldotpTime,newotp).then(function(data){
    req.session.userLoggedIn=true
    req.session.user=data
    res.redirect('/')
  }).catch(function(data){
    req.session.otpErr=data
    res.redirect('/signupotp')
  })
})

router.get('/logout',function(req,res){
  req.session.userLoggedIn=false
  req.session.user=false
  res.redirect('/')
})

router.get('/cart',verifyLogin,async function(req,res){
  let products=await userHelpers.getCartProducts(req.session.user._id)
  let user=req.session.user 
  console.log('products');
  
  cartCount=await userHelpers.getCartCount(req.session.user._id)
  wishlistCount=await userHelpers.getWishlistCount(req.session.user._id)
  if(products.length>0){
  let cartCount=await userHelpers.getCartCount(req.session.user._id)
  console.log(cartCount)
   let total=await userHelpers.getTotalAmount(req.session.user._id)
  
   console.log(products);
  
  res.render('user/cart',{user,products,cartCount,total,cart:true,cartCount,wishlistCount})
  }else{
    res.render('user/cart',{user,wishlistCount})
  }
 
})

router.get('/add-to-cart',function(req,res){
  if(req.session.user){
    console.log('api call')
    userHelpers.addToCart(req.query.id,req.session.user._id).then(function(data){
      if(data){
        console.log(data);
        res.json(data)
      }else{
        res.json({status:true})
      }
      
    })
  }else{
    res.json({status:false})
  }
  
})

router.post('/change-product-quantity',function(req,res){
  userHelpers.changeProductQuantity(req.body).then(async function(response){
    console.log(req.body);
    let total=await userHelpers.getTotalAmount(req.body.userId)
    response.total=total
    res.json(response)
  })
})

router.get('/place-order',verifyLogin,async function(req,res){
  let total=await userHelpers.getTotalAmount(req.session.user._id)
  let cartProduct=await userHelpers.getCartProducts(req.session.user._id)
  let user=await userHelpers.getUserDetails(req.session.user._id)
  let addressData=await userHelpers.getUserAddress(req.session.user._id)
  cartCount=await userHelpers.getCartCount(req.session.user._id)
  wishlistCount=await userHelpers.getWishlistCount(req.session.user._id)
  console.log(addressData);
  if(total){
    console.log(req.session.user);
    res.render('user/place-order',{total,user,cartProduct,addressData,cartCount,wishlistCount})
  }else{
    res.redirect('/cart')
  }
 
})

router.get('/remove-cart-product',function(req,res){
  console.log(req.query);
  userHelpers.romoveCartProducts(req.query).then(function(){
    res.redirect('/cart')
    })
})

router.post('/place-order',async function(req,res){
  console.log(req.body);
  if(req.session.user){
  let addressDetails=await userHelpers.getUserAddress(req.body.userId)
  if(addressDetails){
    if(addressDetails.address.length<1){
      res.json({noaddress:true})
    }else{ let products=await userHelpers.getCartProductList(req.body.userId)
      let total=await userHelpers.getTotalAmount(req.body.userId)
      let addressData=addressDetails.address[req.body.id]
      req.session.address=addressData
      req.session.orderData=req.body
        if(req.body["Payment-method"]=='COD'){
          userHelpers.placeOrder(req.body,products,total,addressData).then(function(response){
          response.codSuccess=true
          console.log('cod');  
          console.log(response);
          res.json(response)
        })
          }else{
            userHelpers.generateRazorpay(total).then(function(response){
              console.log('vrify');
              res.json(response)
            })
          }
        }
  }else{
    res.json({noaddress:true})
  }
 
  }else{
      res.json({nouser:true})
    }
})

router.get('/order-success',async function(req,res){
  let orderId=req.query
  console.log(orderId);
  let orderData=await userHelpers.getOrderProduct(orderId)
  let productqty=orderData.products.length
  user=req.session.user
    res.render('user/order-success',{user,orderData,productqty}) 
})

router.get('/orders',verifyLogin,async function(req,res){
  let orderList=await userHelpers.getOrderList(req.session.user._id)
  cartCount=await userHelpers.getCartCount(req.session.user._id)
  wishlistCount=await userHelpers.getWishlistCount(req.session.user._id)
  user=req.session.user
  
  res.render('user/orders',{orderList,user,cartCount,wishlistCount})
})


router.post('/verify-payment',async function(req,res){
  console.log('verified')
  let products=await userHelpers.getCartProductList(req.session.user._id)
  let total=await userHelpers.getTotalAmount(req.session.user._id)
  addressDetails=req.session.address
  orderData=req.session.orderData
  userHelpers.verifyPayment(req.body).then(function(){
    userHelpers.placeOrder(orderData,products,total,addressDetails).then(function(response){
  req.session.address=false
  req.session.orderData=false
  response.status=true
    res.json(response)
    })
  }).catch(function(){
    res.json({status:false})
  })
})

router.get('/product-details',function(req,res){
  let productId=req.query.productId
  let user=req.session.user
  console.log(productId);
  userHelpers.getProductDetail(productId).then(async(productDetails)=>{
    console.log(productDetails);
    if(req.session.user){
      cartCount=await userHelpers.getCartCount(req.session.user._id)
      wishlistCount=await userHelpers.getWishlistCount(req.session.user._id)
      res.render('user/product-details', {productDetails,user,cartCount,wishlistCount} )
    }else{
      res.render('user/product-details',{productDetails})
    }
  })
})

router.get('/wishlist',verifyLogin,function(req,res){
  userHelpers.getWishlistProduct(req.session.user._id).then(async function(products){
    let user=req.session.user
    cartCount=await userHelpers.getCartCount(req.session.user._id)
    wishlistCount=await userHelpers.getWishlistCount(req.session.user._id)
    res.render('user/my-wishlist',{cartCount,products,user,wishlistCount})
  })
})

router.get('/add-to-wishlist',function(req,res){
  console.log(req.query.id);
  if(req.session.user){
    userHelpers.addToWishlist(req.query.id,req.session.user._id).then(function(data){
      if (data){
        res.json({data})
      }else{
      res.json({status:true})
      }
    })
  }else{
    res.json({status:false})
  }
})

router.get('/remove-wishlist-product',function(req,res){
  userHelpers.removeWishlistProduct(req.query).then(function(){
    res.redirect('/wishlist')
  })
})

router.get('/profile',verifyLogin,async function(req,res){
  let userId=req.session.user._id
  cartCount=await userHelpers.getCartCount(req.session.user._id)
    wishlistCount=await userHelpers.getWishlistCount(req.session.user._id)
  let addressData=await userHelpers.getUserAddress(req.session.user._id)
  console.log(addressData);
  userHelpers.getUserDetails(userId).then(function(userData){
    let user=req.session.user
    res.render('user/profile',{userData,user,addressData,wishlistCount,cartCount})
  })
})

router.post('/edit-userdetails',verifyLogin,function(req,res){
  console.log(req.body);
  let userId=req.session.user._id
  userHelpers.updateUserDetails(userId,req.body).then(function(){
    res.redirect('/profile')
  }).catch(function(){
    res.redirect('/profile')
  })
})

router.get('/shop',function(req,res){
  res.render('user/shop')
})

router.get('/collections',function(req,res){
  console.log(req.query.category);
  let category=req.query.category
  let user=req.session.user
 
  userHelpers.getProductsByCategory(category).then(async function(products){
    let cartCount=null
    let wishlistCount=null
    let user=req.session.user
    if(req.session.user){
      cartCount=await userHelpers.getCartCount(req.session.user._id)
    wishlistCount=await userHelpers.getWishlistCount(req.session.user._id)
    }
    res.render('user/collection',{products,category,user,wishlistCount,cartCount})
  })
})

router.get('/category-pricefilter',async function(req,res){
  let cartCount=null
  let wishlistCount=null
  let user=req.session.user
  let category=req.query.category
  let price=req.query.price
  let products=await userHelpers.getPriceFilterCategoryProfuct(category,price)
  if(req.session.user){
    cartCount=await userHelpers.getCartCount(req.session.user._id)
    wishlistCount=await userHelpers.getWishlistCount(req.session.user._id)
  }
  res.render('user/collection',{products,category,user,wishlistCount,cartCount})
})


router.post('/address',verifyLogin,function(req,res){
  console.log(req.body);
  let addressData=req.body
  let userId=req.session.user._id
  userHelpers.addAddress(userId,addressData).then(function(){
    res.redirect('/profile')
  })
})

router.get('/edit-address',verifyLogin,async function(req,res){
  let id=req.query.id
  let address=await userHelpers.getUserAddress(req.session.user._id)
  let addressData=address.address[id]
  addressData.id=id
  res.json(addressData)
})

router.post('/edit-address',verifyLogin,function(req,res){
  console.log(req.body);
  let editAddressData=req.body
  console.log(editAddressData.id);
  let userId=req.session.user._id
  userHelpers.updateAddress(userId,editAddressData).then(function(){
    res.redirect('/profile')
  })
})

router.get('/delete-address',function(req,res){
  let userId=req.session.user._id
  let id=req.query.id
  userHelpers.deleteAddress(userId,id).then(function(){
    res.redirect('/profile')
  })

})

router.post('/changepasword',function(req,res){
  console.log(req.body);
  let userId=req.session.user._id
  console.log(req.session.user); 
  if(req.session.user){
    userHelpers.changePassword(req.body,userId).then(function(){
      console.log('success');
        res.json({status:true}) 
    }).catch(function(response){
        res.json(response)
    }) 
  }else{
    console.log('done');
    res.jsom({nouser:true})
  }
 
})

router.post("/search",function(req,res){
    productHelpers.getSearchedProducts(req.body.search).then(async function(products){
      let user=req.session.user
    let cartCount=null
    let wishlistCount=null
    if(req.session.user){
      cartCount=await userHelpers.getCartCount(req.session.user._id)
      wishlistCount=await userHelpers.getWishlistCount(req.session.user._id)
    }
      res.render('user/shop',{products,user,cartCount,wishlistCount})
      console.log(req.body.search);
    })  
})


module.exports = router;
