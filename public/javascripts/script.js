  
  function addToCart(productId){
    console.log(productId);
    $.ajax({
      url:'/add-to-cart?id='+productId,
      method:'get',
      success:function(response){
        if(response.status){
          let count=$('#count').html()
          count=parseInt(count)+1
          $('#count').html(count)
          Swal.fire({
            // title: "Product Addes",
            width:"350px",
            text: "product Add to Cart!",
            icon: "success",
            showConfirmButton: false,
            timer: 1500
          });
        }else if(response.exist){
           Swal.fire({
            // title: "Product Addes",
            width:"350px",
            text: "product Add to Cart!",
            icon: "success",
            showConfirmButton: false,
            timer: 1500
          });
        }else{
          location.href='/login'
        }
      }
    })
  }

window.onscroll = function() {scrollFunction()};

function scrollFunction() {
    if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
        document.getElementById("scrlup-btn").style=("display : block; animation: fadeIn 1s;")
    } else {
        document.getElementById("scrlup-btn").style.display = "none";
    }
}
var modal = document.getElementById("myModal");
var main=document.getElementById('zoom')
var img = document.getElementById("myImg");
var modalImg = document.getElementById("img01");
main.onclick = function(){
  console.log(img.src);
  modal.style.display = "block";
  modalImg.src = img.src;
}

var span = document.getElementsByClassName("close")[0];

span.onclick = function() { 
  modal.style.display = "none";
}
function addToWishlist(productId){
  console.log(productId);
    $.ajax({
      url:'/add-to-wishlist?id='+productId,
      method:'get',
      success: function(response){
         if(response.status){
          let count=$('#wishlistcount').html()
          count=parseInt(count)+1
          $('#wishlistcount').html(count)
          Swal.fire({
            // title: "Product Addes",
            width:"350px",
            text: "product Add to Wishlist!",
            icon: "success",
            showConfirmButton: false,
            timer: 1500
          });
         }else if(response.data){
          Swal.fire({
            // title: "Product Addes",
            width:"350px",
            text: "product Already Added to Wishlist!",
            icon: "warning",
            showConfirmButton: false,
            timer: 1500
          });
         }else{
          location.href=('/login')
         }
      }
    })
}

function changeimg(src){
  console.log(src)
  document.getElementById('myImg').src=src
}
