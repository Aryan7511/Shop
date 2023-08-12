
//this is the javascript code that will not run in the server but it will run in the client(browser)
const deleteProduct =async (btn)=>{
 const prodId = btn.parentNode.querySelector('[name=productId]').value;    
 const csrf = btn.parentNode.querySelector('[name=_csrf]').value;    
 const productElement = btn.closest('article');
 try {
    /* we can use the fetch method which is a method supported by the browser for sending http requests
    and it's not just for fetching data as the name might suggest, it's also for sending data. */
        const result = await fetch('/admin/product/' + prodId, {
          method: 'DELETE',
          headers: {
            'csrf-token': csrf
          }
        });
        console.log(result);
        const data = await result.json();
        console.log(data);
        productElement.remove();
    
        console.log('Product deleted successfully');
        
      } catch (error) {
        // Handle network or other errors
        console.error(error);
      }
};

