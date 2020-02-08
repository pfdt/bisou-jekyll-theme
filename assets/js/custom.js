/**
 * A simple JSON search
 * Requires jQuery (v 1.7+)
 *
 * @author  Mat Hayward - Erskine Design
 * @version  0.1
 */

 /* ==========================================================================
    Initialisation
    ========================================================================== */

var q, jsonFeedUrl = "/assets/feeds/feed.json",
    $searchForm = $("[data-search-form]"),
    $searchInput = $("[data-search-input]"),
    allowEmpty = true;
    starFilter = $('.button-group a.button.fa-star');
    signButton = $('#account_card .signButton');
var TIMEOUT_ID = 0;


 /* ==========================================================================
    Mobile Footer
    ========================================================================== */
    
// back home
$('.content-footer .home').on('click', function(){
  window.location.href = '/';
});

// close page
$('.content-footer .close').on('click', function(){
  window.close();
});


 /* ==========================================================================
    Isotope and co
    ========================================================================== */

$(document).ready( function() {
    // initiate search functionality
    initSearch();
    
    // initiate Isotope
	var $gridContainer = $('.grid-layout .container');
	var $grid = $('.grid-layout .container').isotope({
		getSortData: {
		    name: '[data-name]',
		    date: '[data-date]'
		}
	});


 /* ==========================================================================
    Mobile Search
    ========================================================================== */

	// switch search
	$('.searchbar .search_switch').on('click', function(){
		if ($('.searchbar').hasClass('active')){
			$('.searchbar').removeClass('active').addClass('inactive');
			$('.main-nav .navigation').removeClass('hidden');
			$('.searchbar input').val('');
			$grid.isotope({ filter: '*' });
		}
		else {
			$('.searchbar').removeClass('inactive').addClass('active');
			resetFilter();
			$('#q').focus();
			$('.main-nav .navigation').addClass('hidden');
		}
	});
	// Empty search
	$('.searchbar .search_clear').on('click', function(){
	  $('.searchbar input').val('');
	  $grid.isotope({ filter: '*' });
	});


	/* ==========================================================================
	Isotope Filter functions
	========================================================================== */
	
	/*// filter items on button click
	$('.recipes_list .filter-button-group').on( 'click', 'a', function() {
	  var filterValue = $(this).attr('data-filter');
	  $('.button-group a.button').removeClass('active');
	  $(this).addClass('active');
	  $grid.isotope({ filter: filterValue });
	  resultCheck(filterValue);
	  $(window).scrollTop(0);
	});*/
	
	// filter items on button click
	$('.recipes_list .filter-button-group').on( 'click', 'li a.inactive', function() {
		var link = $(this);
		var filterValue = link.attr('data-filter');
		$searchInput.val('');
		$('.button-group a.button').removeClass('active').addClass('inactive');
		link.removeClass('inactive').addClass('active');
		$grid.isotope({ filter: filterValue });
		resultCheck(filterValue);
		$(window).scrollTop(0);
	});

	// filter items on Logo click
	$('.recipes_list .logo a').on( 'click', function() {
		resetFilter();
	});
	$('#noresult a').on( 'click', function() {
		resetFilter();
	});
	$('.recipes_list .filter-button-group').on( 'click', 'li a.active', function() {
		resetFilter();
	});	
	
	// reset filter
	function resetFilter() {
		$grid.isotope({ filter: '*' });
		$(window).scrollTop(0);
		$('.button-group a.button').removeClass('active').addClass('inactive');
		$('#noresult').removeClass('active');
		$('.searchbar input').val('');	
	}
	// no result found
	function resultCheck(filterValue) {
		$('#noresult').removeClass('active');
		if ( $gridContainer.data('isotope').filteredItems.length == 0) {
			$('#noresult').addClass('active');
		}
	};
	
	 /* ==========================================================================
	    Isotope Filter with hash URL
	    ========================================================================== */
	
	// get hash from url
	function getHashFilter() {
		var hash = location.hash;
		// get filter=filterName
		var matches = location.hash.match( /filter=([^&]+)/i );
		var hashFilter = matches && matches[1];
		return hashFilter && decodeURIComponent( hashFilter );
	}
	
	// filter by url for recipe pages
	$( function() {
		// bind filter button click
		$('.recipe .filter-button-group').on( 'click', 'a', function() {
			var filterAttr = $( this ).attr('data-filter');
			// set filter in hash
			window.location.href = '/#filter=' + encodeURIComponent( filterAttr );
		});
		$('.recipe .logo a').on( 'click', function() {
			window.location.href = '/#filter=*';
		});
	
		// filter with url hash
		var isIsotopeInit = false;
		function onHashchange() {
			var hashFilter = getHashFilter();
			if ( !hashFilter && isIsotopeInit ) {
				return;
			}
			isIsotopeInit = true;
			// filter isotope
			$grid.isotope({ filter: hashFilter });
			// set selected class on button
			if ( hashFilter ) {
				history.pushState(null, '', '/');
				$('.filter-button-group').find('[data-filter="' + hashFilter + '"]').addClass('active');
			}
		}
		
		// detect on loading
		$(window).on( 'hashchange', onHashchange );
		// trigger event handler to init Isotope
		onHashchange();
	});
	
	 /* ==========================================================================
	    Search functions
	    ========================================================================== */
	/**
	 * Initiate search functionality.
	 * Shows results based on querystring if present.
	 * Binds search function to form submission.
	 */
	function initSearch() {
	
	    // Get search results if q parameter is set in querystring
	    if (getParameterByName('q')) {
	        q = decodeURIComponent(getParameterByName('q'));
	        $searchInput.val();
	        execSearch(q);
	    }
	
	    // Get search results on submission of form
		$searchInput.bind('input', function(e) {
			clearTimeout(TIMEOUT_ID);
			q = $searchInput.val();
			
			if (q == '') {
				execSearch(q);
			}
			else {
				TIMEOUT_ID = setTimeout(function() {
				e.preventDefault();
			    q = $searchInput.val();
			    execSearch(q);
				}, 300);
			}
	    });
	}
	
	/**
	 * Executes search
	 * @param {String} q 
	 * @return null
	 */
	function execSearch(q) {
	    if (q != '' || allowEmpty) {
	        getSearchResults(processData());
	    }
	}
	
	/**
	 * Get Search results from JSON
	 * @param {Function} callbackFunction 
	 * @return null
	 */
	function getSearchResults(callbackFunction) {
	    $.get(jsonFeedUrl, callbackFunction, 'json');
	}
	
	/**
	 * Process search result data
	 * @return null
	 */
	function processData(data) {
	    var searchValues = [];
	   
	    return function(data) {       
	        var resultsCount = 0;
	        q = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
	        $.each(data, function(index, item) {
	            // check if search term is in content or title
	            var title = item.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
				var ingredients = item.ingredients.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
				var technique = item.technique.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");	
				var categories = item.categories.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
	                                 
	            if (title.indexOf(q) > -1  ||
	            	ingredients.indexOf(q) > -1 ||
	            	technique.indexOf(q) > -1 ||
	            	categories.indexOf(q) > -1)
	            	{
					var searchValue = item.data_search;
					resultsCount++;
					searchValues.push(searchValue);
	            }
	        });
	        if (resultsCount > 0) {
				var filterValues = searchValues.join(', ');
				$grid.isotope({ filter: filterValues });
				$(window).scrollTop(0);
			}
			else {
				$grid.isotope({ filter: ':not(*)' });
				resultCheck('');
			}
			$('.button-group a.button').removeClass('active').addClass('inactive');
	    }
	}
	
	/*
	 * Gets query string parameter - taken from http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
	 * @param {String} name 
	 * @return {String} parameter value
	 */
	function getParameterByName(name) {
	    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
	    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
	}
	
	 /* ==========================================================================
	    Firebase Star system
	    ========================================================================== */
	
	// Initialize Firebase
	var config = {
		apiKey: "AIzaSyDs-yIhiRubGP8cz3tgC0ebX4XbFg67-dU",
		authDomain: "bbisous-db.firebaseapp.com",
		databaseURL: "https://bbisous-db.firebaseio.com",
		projectId: "bbisous-db",
		storageBucket: "bbisous-db.appspot.com",
		messagingSenderId: "112503279307"
	};
	firebase.initializeApp(config);
	
	// Google Auth function
	var provider = new firebase.auth.GoogleAuthProvider();
	
	function googleSignin() {
	   firebase.auth()
	   
	   .signInWithRedirect(provider).then(function(result) {
	      var token = result.credential.accessToken;
	      var user = result.user;		
	      console.log(token)
	      console.log(user)
	   }).catch(function(error) {
	      var errorCode = error.code;
	      var errorMessage = error.message;
	      console.log(error.code)
	      console.log(error.message)
	   });
	}
	function googleSignout() {
	   firebase.auth().signOut()
	   .then(function() {
	      console.log('Signout Succesfull')
	      
	   }, function(error) {
	      console.log('Signout Failed')  
	   });
	}
	signButton.on('click', function(){
		var user = firebase.auth().currentUser;
		if (user) {
		  // User is signed in.
		  googleSignout();
		} else {
		  // No user is signed in.
		  googleSignin();
		}
	});
	
	// Load firebase datas function
	function loadData(path) {
		return firebase.database().ref(path).once("value");
	};
	
	// Check Star Status on load
	firebase.auth().onAuthStateChanged(function(user) {
		if (user) {
			// User is signed in.
			var userId = firebase.auth().currentUser.uid;		
			$('#account_card').addClass('connected');
			
			loadData(userId).then((snapshot) => {
				var recipes = [];
				var filterValue = [];
				
				// Admin or not ?
				var role = snapshot.val().role || 'user';
				if(role == 'admin'){
					$('.adminContent').addClass('adminOn');
				}
				
				// Push stars users data into collection
				snapshot.child("recipes").forEach(function(childSnapshot) {
					recipes[childSnapshot.key] = childSnapshot.val().star;
			    });
			    		    
			    // Check starred status
			    for (var item in recipes) {
				    var value = recipes[item];
				    if (value == true) {
					    $( '.r_'+item+' .star' ).removeClass('far').addClass('fas');
					    filterValue.push('.r_'+item);
				    }
			    }
			    
			    // assign star button
				var filterValue = filterValue.toString() || '#account_card';
				if (filterValue != '#account_card') {
					filterValue += ',#account_card';
				}
				starFilter.attr('data-filter', filterValue);
			});	
			$( '.star' ).removeClass('signout');
		} else {
			// No user is signed in.
			$( '.star' ).addClass('signout');
			$('#account_card').removeClass('connected');
			$('.adminContent').removeClass('adminOn');
		}
	});
	
	
	// Toggle starStatus
	$('.star').on('click', function() {
		var star = $(this);
		var recipe = star.attr('value');
		// check if user is signed in
		var userId = firebase.auth().currentUser.uid;
		if (userId) {
		  // User is signed in.
		} else {
		  // No user is signed in.
		  googleSignin();
		}
		
		// get var
		var path = userId + '/recipes/' + recipe;
		// get status and toggle
		loadData(path).then((snapshot) => {
			var filterValue = starFilter.attr('data-filter');
			if (snapshot.val() == null || snapshot.val().star == false) {
				star.removeClass('far').addClass('fas');
				filterValue += ',.r_'+recipe;
				var filterValue = filterValue.replace('#account_card', '').replace(/^,/, '').replace(',,',',');
				filterValue += ',#account_card';
				starFilter.attr('data-filter', filterValue);
				firebase.database().ref(path).update({
				star: true
				});
			}
			else {
				star.removeClass('fas').addClass('far');
				var filterValue = filterValue.replace('.r_'+recipe,'').replace(',,',',').replace(/,$/, '').replace(/^,/, '') || '#account_card';
				firebase.database().ref(path).update({
			    star: false
				});
			}
			starFilter.attr('data-filter', filterValue);
			
			// reload isotope if starpage
			if (starFilter.hasClass('active')) {
				$grid.isotope({ filter: filterValue });
			}		
		});
	});
	
	// resetStars
	$('.resetStars').on('click', function() {
		// check if user is signed in
		var userId = firebase.auth().currentUser.uid;
		if (userId) {
		  // User is signed in.
		} else {
		  // No user is signed in.
		  googleSignin();
		}
		
		// get var
		var path = userId + '/recipes/';
		loadData(path).then((snapshot) => {
			snapshot.forEach(function(childSnapshot) {
				firebase.database().ref(path+'/'+childSnapshot.key).remove();
			});
		});
		
		// reload isotope
		$grid.isotope({ filter: '#account_card' });
		starFilter.attr('data-filter', '#account_card');
		
	});
});
