---
---
/* ==========================================================================
	Initialisation
========================================================================== */

var
	q,
	TIMEOUT_ID = 0,
	activeSidebar = false,
	wideLayout = true,
	currentFilter,
	currentSort,
	currentSortOrder,
	currentBookmarks = ':not(*)',
	currentUserID,
	jsonFeed,
	userPhotoURL;

const
	allowEmpty = false,
	disableBodyScroll = bodyScrollLock.disableBodyScroll,
	enableBodyScroll = bodyScrollLock.enableBodyScroll,
	jsonFeedUrl = '/assets/feeds/feed.json',
	firebase_apiKey = {{ site.firebase_apiKey | jsonify }},
	firebase_projectId = {{ site.firebase_projectId | jsonify }},
	firebase_databaseName = {{ site.firebase_databaseName | jsonify }},
	firebase_authDomain = firebase_projectId+'.firebaseapp.com',
	firebase_databaseURL = firebase_databaseName+'.firebaseio.com',
	firebase_storageBucket = firebase_projectId+'.appspot.com',
	signedIn_modalTitle = {{ site.data.taxonomies.account.signed-in_title | jsonify }},
	signedIn_modalBody = {{ site.data.taxonomies.account.signed-in_body | markdownify | jsonify }},
	signedIn_modalClose = {{ site.data.taxonomies.account.signed-in_close | jsonify }},
	login_modalTitle = {{ site.data.taxonomies.account.login_title | jsonify }},
	login_modalBody = {{ site.data.taxonomies.account.login_body | markdownify | jsonify }},
	login_modalClose = {{ site.data.taxonomies.account.login_close | jsonify }};

$(document).ready(function () {
    const
		$htmlBody = $("html, body"),
		$1em = parseFloat(getComputedStyle(document.body, null).fontSize),
		scrollTopOffset = $1em * 6.3,
		wideLayoutBreakingpoint = $1em * 35.5,
		$searchInput = $("#searchbar__input"),
		$emptySearch = $("#searchbar__empty-search"),
		$allMenuItems = $(".filter-button"),
		$gridContainer = $("#isotopeContent"),
		$bookmarksFilter = $("#filter-button--bookmarks"),
		$recipesAll = $("#filter-button--all-recipes"),
		$sidebar = document.querySelector('#sidebar'),
		$accountModal = document.querySelector('#account-modal');

    /* ==========================================================================
	Initiate on launch
	========================================================================== */
		
    // Lady load - image loading
    initiateLazyLoad();
	
    // Isotope - initiate
    var $grid = $($gridContainer).isotope({
        itemSelector: '.grid-item',
        getSortData: {
            name: "[data-name]",
            date: "[data-date]",
            rating: "[data-rating]",
        },
		/*
		hiddenStyle: {
			opacity: 0
		},
		visibleStyle: {
			opacity: 1
		},
		*/
		transitionDuration: 0
    });

	var $items = $grid.find(".grid-item");
    $grid.addClass("showOn").isotope("revealItemElements", $items);

    // URL hash detector
    detectHash();

    // Firebase - initiate
    initiateFirebase();

    function initiateFirebase() {
        var config = {
            apiKey: firebase_apiKey,
            authDomain: firebase_authDomain,
            databaseURL: firebase_databaseURL,
            storageBucket: firebase_storageBucket
        };
        firebase.initializeApp(config);
    }

    // Firebase - on auth change
    firebase.auth().onAuthStateChanged(function (user) {
        loadFirebaseDatas(user);
    });
    
    // Get dark theme preference
    getThemePreference();


    /* ==========================================================================
	Loading functions
	========================================================================== */
	
    /**
     * Lazy load - image loading
     */
    async function initiateLazyLoad() {
        var lazyLoadInstance = new LazyLoad({
            elements_selector: ".lazy",
        });
    }

    /**
     * Detect on loading if there is an hash in the url.
     */

    async function detectHash() {
        var URLparam = location.search || "";

        if (URLparam !== "") {
            getHashParam(URLparam);
        } else {
            defaultFilter();
            defaultSort();
        }
    }

    /**
     * Get hash param and set the filter & sorting value
     */
    function getHashParam(URLparam) {
        getCurrentFilter(URLparam);
        getCurrentSort(URLparam);
    }

    async function getCurrentFilter(URLparam) {
        var paramCat = URLparam.match(/(\?(q|cat)=.*?(?=&|(?=$)))/g)[0] || "";
        var paramSearch = paramCat.includes("?q=");
        paramCat = paramCat.toString().replace("?cat=", "").replace("?q=", "") || "*";

        if (paramCat == "bookmarks") {
	        var filterValue = currentBookmarks; 
	        currentFilter = "cat=" + paramCat;
			$bookmarksFilter.addClass("active");
			isotopeFilter(filterValue);
        } else if (paramSearch == true) {       
            currentFilter = "q=" + paramCat;
            let searchInput = decodeURIComponent(paramCat);
            $searchInput.val(searchInput);
        } else if (paramCat !== "all") {
            var filterValue = ".c_" + paramCat;
            currentFilter = "cat=" + paramCat;
            $(".filter-button-group")
                .find('[data-filter="' + filterValue + '"]')
                .addClass("active");
            isotopeFilter(filterValue);
        } else {
            defaultFilter();
        }
    }

    async function getCurrentSort(URLparam) {
        URLparam = URLparam.match(/(&sort=.*?(?=$))/g) || "";
        URLparam = URLparam.toString().replace("&sort=", "");
        var sortOrder = URLparam.split("_")[1];
        var sort = URLparam.split("_")[0];
        currentSort = sort;

        if (sort !== "") {
            if ((sort == "name" && sortOrder == "asc") || (sort !== "name" && sortOrder !== "desc")) {
                currentSortOrder = "asc";
                isotopeSort();
            } else {
                currentSortOrder = "desc";
                isotopeSort();
            }
            layoutCleanSort();
        } else {
            defaultSort();
        }
    }

    async function defaultFilter() {
        currentFilter = "cat=all";
        $recipesAll.addClass("active");
    }
    async function defaultSort() {
        currentSort = "name";
        currentSortOrder = "asc";
        $("#sort-button--name").addClass("asc");
    }

    /**
     * Firebase - get user, bookmark and star value on loading and auth change
     */
    async function loadFirebaseDatas(user) {

        if (user) {
            currentUserID = user.uid;       
            userPhotoURL = user.photoURL;

            // Retrieve and push bookmarks status
            getFirebaseBookmars(currentUserID);

            // Retrieve and push Rating status
            getFirebaseRatings(currentUserID);

            // show signed-in contents
            signedIn();

            // Admin or not ?
            getFirebaseAdminStatus(currentUserID);
        } else {
		    currentUserID = undefined;
            // hide signed-in contents
            signedOut();
            
            // update Bookmarks page if is current page
			if (currentFilter == "cat=bookmarks") {
				modalON();
			}
        }
    }

    // Retrieve and push bookmarks status
    async function getFirebaseBookmars(currentUserID) {
        firebase
            .database()
            .ref(currentUserID + "/recipes/")
            .orderByChild("bookmark")
            .equalTo(true)
            .on("value", function (snapshot) {
                var filterValue = [];
                filterValue.push(":not(*)");
                snapshot.forEach(function (child) {
                    let recipe = child.key;
                    $(".r_" + recipe + " .card__body__controls__bookmark").addClass("active");
                    filterValue.push(".r_" + recipe);
                });

                // assign bookmarks button
                filterValue = filterValue.toString();
                currentBookmarks = filterValue;
                $bookmarksFilter.attr("data-filter", filterValue);

                // update Bookmarks page if is current page
                if (currentFilter == "cat=bookmarks") {
                    isotopeFilter(filterValue);
                }
            });
    }

    // Retrieve and push Rating status
    async function getFirebaseRatings(currentUserID) {
        firebase
            .database()
            .ref(currentUserID + "/recipes/")
            .orderByChild("rating")
            .startAt(1)
            .on("value", function (snapshot) {
                snapshot.forEach(function (child) {
                    let recipe = child.key;
                    let rating = child.val().rating;
                    $(".r_" + recipe).attr("data-rating", rating);
                    $(".r_" + recipe + " .card__body__controls__rating")
                        .addClass("active")
                        .find(".rating__icons." + rating)
                        .addClass("active");
                });

                // update sorting datas
                isotopeSortUpdate();
            });
    }

    // Admin or not ?
    async function getFirebaseAdminStatus(currentUserID) {
        firebase
            .database()
            .ref(currentUserID + "/role")
            .on("value", function (snapshot) {
                if (snapshot.val() == "admin") {
                    $(".adminContent").addClass("active");
                }
            });
    }

    /**
     * Firebase Google Auth functions
     */

    var provider = new firebase.auth.GoogleAuthProvider();

    function googleSignin() {
        firebase
            .auth()
            .signInWithRedirect(provider)
            .then(function (result) {
                var token = result.credential.accessToken;
                var user = result.user;
                console.log(token);
                console.log(user);
            })
            .catch(function (error) {
                var errorCode = error.code;
                var errorMessage = error.message;
                console.log(error.code);
                console.log(error.message);
            });
    }
    function googleSignout() {
        firebase
            .auth()
            .signOut()
            .then(
                function () {
                    console.log("Signout Succesfull");
                },
                function (error) {
                    console.log("Signout Failed");
                }
            );
    }

    /**
     * Layout signedIn functions
     */

    async function signedIn() {
        $('body').addClass("signed-in");
        $('.main-nav__icons--account').css('background-image', "url('"+userPhotoURL+"')");
        $('.main-nav__icons--account > path').css('display', 'none');
        $('.modal-title').html(signedIn_modalTitle);
        $('.modal-content__body').html(signedIn_modalBody);
        $('.modal-content__button .modal-off').html(signedIn_modalClose);
    }
    async function signedOut() {
        $('body').removeClass('signed-in');
		$('.main-nav__icons--account').css('background-image', 'none');
        $('.main-nav__icons--account > path').css('display', 'block');
        $('.modal-title').html(login_modalTitle);
        $('.modal-content__body').html(login_modalBody);
        $('.modal-content__button .modal-off').html(login_modalClose);
        $('.adminContent').removeClass('active');
        currentBookmarks = ':not(*)';
    }
    
    /**
     * Theme preference
     */
	async function getThemePreference() {
		currentTheme = localStorage.getItem('theme') ? localStorage.getItem('theme') : null;
		if (currentTheme && currentTheme === 'dark') {
		    $(".theme-switch input[type='checkbox']").prop( "checked", true );
		}
	}
    

    /* ==========================================================================
	Interactivity / triggers
	========================================================================== */

    // Trigger window width calc
    wideWindowDetector();

    // Detect window resize
    $(window).resize(function () {
        wideWindowDetector();
    });

    // header logo click
    $("#main-nav").on("click", "#logo", function () {
        resetFilter();
        disableSidebarCondition();
    });
    
    // header burger click
    $("#main-nav").on("click", "#burger", function () {
        toggleBurger();
    });
    
    // header account click
    $("#main-nav").on("click", "#account", function () {
        modalON();
    });
    
    // sidebar filter special items
    $("#filter-button--specials").on("click", "a", function () {
        filterSpecials($(this));
    });

    // sidebar filter items click
    $("#filter-button--categories").on("click", "a", function () {
        filterCategories($(this));
    });

    // sidebar sort items click
    $("#sorting-button-group").on("click", "li", function () {
        sortItems($(this));
    });
       
    // sidebar empty search
    $("#searchbar__form").on("click", "#searchbar__empty-search", function () {
        resetFilter();
    });
    
    // recipe bookmark clic
    $(".card__body__controls").on("click", ".card__body__controls__bookmark", function () {
        toggleBookmark($(this));
    });

    // recipe star clic
    $(".card__body__controls").on("click", ".rating__icons", function () {
        saveRating($(this));
    });
    
    // body no-result
	$("#no-result").on("click", "a", function () {
        resetFilter();
    });
      
    // modal signIn click
    $(".modal-content__button").on("click", "#button--signIn", function () {
	    googleSignin();
    });
    
    // modal signOut click
    $(".modal-content__button").on("click", "#button--signOut", function () {
	    googleSignout();
	    signedOut();
		if (currentFilter == "cat=bookmarks") {
	        resetFilter();
        }
    });
    
    // modal close modal click
    $("#account-modal").on("click", ".js-close-modal", function () {
        modalOFF();
		if (!currentUserID) {
        	resetFilter();
        }
    });

    // overlay--sidebar click
    $("body").on("click", "#overlay--sidebar", function () {
        disableSidebar();
    });
    
	// overlay--modal click
	$("body").on("click", "#overlay--modal", function () {
        modalOFF();
		if (!currentUserID) {
        	resetFilter();
        }
    });

	// theme switcher click
    $(".theme-switch").on("change", "input[type='checkbox']", function () {
	    switchTheme($(this));
    });
		
    // initiate search functionality
    initSearch();


    /* ==========================================================================
	Interactivity / functions
	========================================================================== */

    // Load firebase datas function
    function loadData(path) {
        return firebase.database().ref(path).once("value");
    }

    /**
     * Set the var wideLayout depends on breakpoint
     */
  
	async function wideWindowDetector() {
	    let newWideLayout = $(window).width() > wideLayoutBreakingpoint;    	        
		if (newWideLayout !== wideLayout) {
			if (activeSidebar == true) {
				disableSidebar();	
			}
			wideLayout = !wideLayout;
		}
	}

    /**
     * Burger button click
     */
    async function toggleBurger() {
        if (activeSidebar == true) {
            disableSidebar();
        } else {
            activateSidebar();
        }
        $gridContainer.isotope("layout");
    }

    /**
     * Isotope filter functions
     */

    async function filterSpecials(link) {
        if (link.is($recipesAll)) {
            resetFilter();
            disableSidebarCondition();
        } else if (link.is($bookmarksFilter)) {
            bookmarksFilter(link);
        }
    }

    // active or desactive on filter click
    async function filterCategories(link) {
        let activeFilter = link.hasClass("active");
        if (activeFilter == true && wideLayout == false) {
            disableSidebar();
        } else if (activeFilter == true && wideLayout == true) {
            resetFilter();
        } else {
            // filter
            var filterValue = link.attr("data-filter");
            currentFilter = "cat=" + filterValue.replace(".c_", "");
            
            // clean filter value
            layoutCleanFilter(link);

            // clean search value
            layoutCleanSearch();
			
			// filter items
			isotopeFilter(filterValue);
			
            // change url
            pushURL();

            // disable sidebar if widelayout == false
            disableSidebarCondition();
        }
    }

    async function bookmarksFilter(link) {
        let activeFilter = link.hasClass("active");
        if (activeFilter == true && wideLayout == false) {
            disableSidebar();
        } else if (activeFilter == true && wideLayout == true) {
            resetFilter();
        } else {
            if (!currentUserID) {
	            modalON();
            }
            
            // filter
            currentFilter = "cat=bookmarks";
            isotopeFilter(currentBookmarks);

            // clean filter value
            layoutCleanFilter(link);

            // clean search value
            layoutCleanSearch();

            // change url
            pushURL();

            // disable sidebar if widelayout == false
            disableSidebarCondition();
        }
    }

    // reset filter
    async function resetFilter() {
        currentFilter = "cat=all";
        layoutCleanFilter($recipesAll);
        layoutCleanSearch();
        isotopeFilter('*');
        pushURL();
    }

    // clean filter value
    async function layoutCleanFilter(link) {
        $allMenuItems.removeClass("active");
        link.addClass("active");
    }

    // clean search value
    async function layoutCleanSearch() {
        $($emptySearch).removeClass("active");
        $("#no-result").removeClass("active");
        $searchInput.val("");
    }

    // Isotope filter
    async function isotopeFilter(filterValue) {
        $grid.isotope({ filter: filterValue });
		$htmlBody.animate({scrollTop: 0});
    }

    // Isotope sorting
    async function isotopeSort() {
        if (currentSortOrder == "asc") {
            var sortAscendingValue = true;
        } else {
            var sortAscendingValue = false;
        }
        $grid.isotope({ sortBy: currentSort, sortAscending: sortAscendingValue });
    }

    // Isotope update sorting
    async function isotopeSortUpdate() {
        $grid.isotope("updateSortData").isotope();
    }

    /**
     * Isotope sorting functions
     */

    function sortItems(sortButton) {
        var sort = sortButton.attr("data-sorting");
        currentSort = sort;

        if ((sort == "name" && currentSortOrder == "asc") || (sort !== "name" && currentSortOrder !== "desc")) {
            currentSortOrder = "desc";
            isotopeSort();
        } else {
            currentSortOrder = "asc";
            isotopeSort();
        }

        // clean sorting value
        layoutCleanSort();

        // push sorting URL
        pushURL();
    }

    // clean sorting value
    async function layoutCleanSort() {
        $(".sort-button").removeClass("asc").removeClass("desc");
        $("#sort-button--" + currentSort).addClass(currentSortOrder);
    }

    // push filter & sorting URL
    async function pushURL() {
       history.replaceState(null, "", "/?" + currentFilter + "&sort=" + currentSort + "_" + currentSortOrder);
    }

    /**
     * active or desactive sidebar functions
     */

    async function activateSidebar() {
        activeSidebar = true;
        $("body").addClass("activeSidebar");
		if (wideLayout == false) {
			disableBodyScroll($sidebar);
        }
    }
	
    async function disableSidebar() {
        activeSidebar = false;
        $("body").removeClass("activeSidebar");
        enableBodyScroll($sidebar);
    }
    async function disableSidebarCondition() {
        if (wideLayout == false) {
            disableSidebar();
        }
    }

    /**
     * toggle recipe bookmark status on firebase and layout
     */

    function toggleBookmark(bookmark) {
        if (currentUserID) {
            var recipe = bookmark.attr("value");

            // get var
            var path = currentUserID + "/recipes/" + recipe;
            // get status and toggle
            loadData(path).then((snapshot) => {
                var filterValue = currentBookmarks;
                if (snapshot.val() == null || snapshot.val().bookmark == false) {
                    bookmark.addClass("active");
                    filterValue += ",.r_" + recipe;
                    filterValue = filterValue.replace(/^,/, "").replace(",,", ",");
                    firebase.database().ref(path).update({
                        bookmark: true,
                    });
                } else {
                    bookmark.removeClass("active");
                    filterValue = filterValue
                        .replace(".r_" + recipe, "")
                        .replace(",,", ",")
                        .replace(/,$/, "")
                        .replace(/^,/, "");
                    firebase.database().ref(path).update({
                        bookmark: false,
                    });
                }
                currentBookmarks = filterValue;
                $bookmarksFilter.attr("data-filter", filterValue);

                // reload isotope if Bookmarks page
                if (currentFilter == "cat=bookmarks") {
                    isotopeFilter(filterValue);
                }
            });
        } else {
            modalON();
        }
    }

    /**
     * save recipe rating on firebase and layout
     */

    function saveRating(ratingObject) {
        if (currentUserID) {
            // get var
            var recipeObject = ratingObject.parent().closest(".card__body__controls__rating");
            var recipe = recipeObject.attr("value");
            var path = currentUserID + "/recipes/" + recipe;

            // save new rating
            loadData(path).then((snapshot) => {
                var stars = Number(ratingObject.attr("value"));

                if (snapshot.val() !== null && snapshot.val().rating == stars) {
                    var stars = 0;
                    recipeObject.removeClass("active").find(".rating__icons").removeClass("active");
                } else {
                    recipeObject.addClass("active").find(".rating__icons").removeClass("active");
                    ratingObject.addClass("active");
                }
                firebase.database().ref(path).update({
                    rating: stars,
                });
                $(".r_" + recipe).attr("data-rating", stars);

                // update sort datas
                isotopeSortUpdate();
            });
        } else {
            modalON();
        }
    }

    /**
     * modal ON and OFF functions
     */

    async function modalON() {
        $("#account-modal").addClass("show");
        $("body").addClass("modal-open");
        disableBodyScroll($accountModal);
    }
    async function modalOFF() {
        $("#account-modal").removeClass("show");
        $("body").removeClass("modal-open");
        enableBodyScroll($accountModal);
    }
    
	// theme switcher
	function switchTheme(e) {
	    if(e.is(':checked')) {
			document.documentElement.setAttribute('data-theme', 'dark');
			localStorage.setItem('theme', 'dark');
	    } else {
			document.documentElement.setAttribute('data-theme', 'light');
			localStorage.setItem('theme', 'light');
	    }
	}

    /**
     * Search functions
     */

    async function initSearch() {
        // Get json file
        getUpdatedJson();
        // Get search results on submission of form
        $searchInput.bind("input", function (e) {
            clearTimeout(TIMEOUT_ID);
            q = $searchInput.val();
            if (q == "") {
                resetFilter();
            } else {
                TIMEOUT_ID = setTimeout(function () {
                    e.preventDefault();
                    execSearch(q);
                }, 250);
            }
        });
    }

    // Get and update Json
    function getUpdatedJson() {
        $.getJSON(jsonFeedUrl, function(data) {
            let rawJsonFeed = JSON.stringify(data).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            jsonFeed = JSON.parse(rawJsonFeed);
            getInitialSearch();
        });
    }

    // Executes search
    async function getInitialSearch() {
        q = $searchInput.val();
        if (q) {
            execSearch(q);
        }
    }

    // Executes search
    function execSearch(q) {
        if (q != "" || allowEmpty) {
            getSearchResults();
        }
    }

    // Process search result data
    function getSearchResults() {
        var searchValues = [];
        var resultsCount = 0;
        q = q
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[\u2019]/g, "'");
        console.log(q);
        $.each(jsonFeed, function (index, item) {
            // check if search term is in content or title
            let title = item.title || "";
            let ingredients = item.ingredients || "";
            let technique = item.technique || "";
            let category = item.category || "";
            let source = item.source || "";

            if (title.indexOf(q) > -1 || ingredients.indexOf(q) > -1 || technique.indexOf(q) > -1 || category.indexOf(q) > -1 || source.indexOf(q) > -1) {
                searchValue = item.data_search;
                resultsCount++;
                searchValues.push(searchValue);
            }
        });
        if (resultsCount > 0) {
            var filterValue = searchValues.join(", ");
            currentFilter = "q=" + encodeURIComponent(q);
            $("#no-result").removeClass("active");
            pushURL();
        } else {
            var filterValue = ":not(*)";
            $("#no-result").addClass("active");
        }
        layoutCleanFilter($emptySearch);
        isotopeFilter(filterValue);
    }
});