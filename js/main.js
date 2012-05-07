/*
 * main.js
 * 
 * Write by Xuqing Kuang <kuang@thundersoft.com>
 * All right reserved by Thunder Software Technology Co., Ltd.
 * 
 */

////////////////////////////////////////////////////////////////////////////////
// Initialization code
////////////////////////////////////////////////////////////////////////////////

var debug = true; // Debug or not

var browser;

var originImage, image, filteredImageData;

var canvas, context;

var texture;

var filters;
var pencil;

var putDecorations = [];

var fakeScreenWidth = 480;

var detectBrowser = function() {
    // Check for the various File API support.
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        print('Great success! All the File APIs are supported.');
    } else {
        printError({message: 'The File APIs are not fully supported in this browser.'});
        return false;
    }
    
    // Check for the various Graphic API support.
    var elem = document.createElement('canvas');
    if (elem.getContext && elem.getContext('2d')) {
        print('Great success! The Canvas APIs are supported.');
    } else {
        printError({message: 'The Canvas APIs are not fully supported in this browser.'});
        return false;
    }
    
    // Browser detection
    if(typeof tizen != 'undefined') {
         return new TizenBrowser();
    } else {
    	return new DefaultBrowser();
    }
};

function initUITools () {
	/* Initial cancel button in editor page */
	function initBackButton () {
		$('#editor > div[data-role="header"] > a[href="#samples"]').click(function(e) {
			var quitEditing = confirm('Are you sure to cancel ?');
			
			// When clicked cancel, ignore the decision.
			if(!quitEditing) {
				e.preventDefault();
				return false;
			}
			
			// When clicked OK, empty the image.
			originImage.removeAttribute('src');
			originImage.removeAttribute('width');
			originImage.removeAttribute('height');
		});
	}
	
	/* Initial the save/restore feature */
	function initFileFunctions() {
		$('select[name="fileActions"]').change(function(e) {
			switch (this.value) {
			case 'restore':
				restoreImage();
				break;
			case 'save':
				saveImage();
				break;
			}

			// Restore the select status
			this.selectedIndex = 0;
			$(this).selectmenu("refresh");
		});
	}
	
	/* Initial toolbar in editor page */
	function initTabToolbar() {
		$('#tabToolbar a').click(function(e) {
			var link_element = $(this);

			// Highlight current tab
			link_element.parent().parent().find('a').removeClass('ui-btn-active');
			link_element.addClass('ui-btn-active');
			
			// Switch to the tab
			var link_to = link_element.attr('href').substring(1, 100);
			print('Switch to tab - ' + link_to);
			$('#tools > div').hide();
			$('#tools > div#' + link_to).show();
			
			// Show the contents of tab
			$('div#editor > div[data-role="content"]').trigger('dblclick');
			
			// Specific code for graffiti
			pencil.bindCanvasEvents();
			if(link_to == 'graffiti') {
				pencil.enabled = true;
			} else {
				pencil.enabled = false;
			}
		});
	}

	
	/* Initial decorations in tab */
	function initDecorations (num) {
		// Binding the clear function
		$('div#decors > a#clearDecors').click(function(e) { clearDecorations(); });
		
		// Add elements
		i = 1;
		while (i <= num) {
			var img_name = i + '.png';
			var img_path = './res/decors/' + img_name;
			
			var link = $('<a>').attr(
				'href', 'javascript:putDecoration(\'' + img_path + '\')'
			);
			
			var img = $('<img>').attr({
				'class': 'decoration', 'src': img_path, 'alt': img_name,
				'width': '48', 'height': '48'
			});
			
			link.html(img);
			// link.button({'theme': 'a', 'refresh': true});
			$('div#decors').append(link);
			
			i += 1;
		}
	}

	/* Initial the borders/frame tab */
	function initBorders (num) {
		// Initial the clear function
		var clearBtnElement = $('<a>').attr({
			'href': '#clear'
		}).click(clearBorders).appendTo('div#borders');
		$('<img>').attr('src', './css/images/clear.gif').appendTo(clearBtnElement);
		
		// Add elements
		i = 1;	
		while (i <= num) {
			var img_path = './res/borders/' + i + '/preview.jpg';
			
			var link = $('<a>').attr(
				'href', 'javascript:setBorder(\'' + i + '\')'
			);
			
			var img = $('<img>').attr({
				'class': 'border', 'src': img_path, 'alt': 'Border ' + i,
				'width': '48', 'height': '48'
			});
			link.html(img);
			// link.button({'theme': 'a', 'refresh': true});
			$('div#borders').append(link);
			
			i += 1;
		}
	}
	
	/* Initial the adjustment features */
	function initAdjustment() {
		$('div#edit > div.normal > a').click(function(e) {
			var link_element = $(this);
			filter_name = link_element.parent().attr('id');
			value = parseInt(link_element.attr('href').substring(1, 100));
			print('Executing adjustment - ' + filter_name + ' - with argument - ' + value);
			filters.drawFilterImage(filters[filter_name], image, value);
		});
		
	}
	
	/* Initial the filter features */
	function initFilters() {
		var normalEffectEvent = function(e) {
			var link_element = $(this);
			var link_to = link_element.attr('href').substring(1, 100);
			print('Applied normal filter - ' + link_to);
			filters.drawFilterImage(filters[link_to], image);
		};
		
		var convoluteEffectEvent = function(e) {
			var link_element = $(this);
			var link_to = link_element.attr('href').substring(1, 100);
			print('Applied convolute filter - ' + link_to);
			filters.drawFilterImage(filters.convolute, image, filters.convoluteArguments[link_to]);
		};
		
		for (var i=0; i<filters.effects.length; i++) {
			var name = filters.effects[i][0];
			var type = filters.effects[i][1];
			var shortName = filters.effects[i][2];
			
			var element = $('<a>').attr({'id': 'effect_' + name, 'href': '#' + name, 'class': 'button'});
			element.html(shortName);

			switch (type) {
				case 'normal':
					element.click(normalEffectEvent);
					break;
				case 'convolute':
					element.click(convoluteEffectEvent);
					break;
			}
			
			// element.button({'theme':'a', 'refresh': true});
			$('#effects').append(element);
		}
	}
	
	/* Initial the color selector */
	function initGraffiti() {
		var colorClickedHandler = function(e) {
			var link_element = $(this);
			var link_to = link_element.attr('href').substring(1, 100);
			print('Change pencil color to - ' + link_to);
			pencil.color = link_to;
			
			// Change the color directly
	        context.fillStyle = pencil.color;
	        context.strokeStyle = pencil.color;
		};
		
		colors = ['black', 'white', 'red', 'yellow', 'blue', 'green'];
		for (var i=0; i<colors.length; i++) {
			var color = colors[i];
			var element = $('<a>').attr({
				'id': color,
				'href': '#'+color
			}).click(
				colorClickedHandler
			);
			$('div#graffiti').append(element);
		}
	}
	
	// Start to run
	initBackButton();
	initFileFunctions();
	initTabToolbar();
	initDecorations(4);
	initBorders(2);
	initAdjustment();
	initFilters();
	initGraffiti();
	
	// iScroll 4 elements
	// new iScroll('div#editor > div[data-role="footer"] > div#tools');
}

function initSampleGallery(num) {
	var addSampleImages = function(num) {
		i = 1;	
		while (i <= num) {
			var img_name = i + '.jpg';
			var img_path = './res/samples/' + img_name;
			
			var container = $('<div>').attr('class', 'crop');
			var link = $('<a>').attr(
				'href', 'javascript:moveImageToEditor(\'' + img_path + '\')'
			);
			
			var img = $('<img>').attr({
				'class': 'lazy', 'data-original': img_path, 'alt': img_name,
				'width': '140', 'height': '140'
			});
			
			link.html(img);
			container.html(link);
			$('div#sampleGallery').append(container);
			
			i += 1;
		}
	};

	
	print('Binding page events for div#samples');
	$('div#samples').live('pageshow', function(e, ui) {
		addSampleImages(num);
		
		// Process the images
		var lazyImages = $('img.lazy');
		lazyImages.lazyload({'effect': 'fadeIn'});
		
		lazyImages.each(function(i) {
			setTimeout(function() {
				// console.log(lazyImages[i]);
				$(lazyImages[i]).trigger('appear');
			}, 200*i);
		});
	});
	
	$('div#samples').live('pagehide', function(e, ui) {
		var lazyImages = $('img.lazy');
		lazyImages.parent().parent().remove();
	});
	
	
}

//Initialize function
var init = function () {
    print("init() called");
    
    print('Start browser detection');
    browser = detectBrowser();
    if(!browser) {
        printError({message: 'Your browser seems not supported yet.'});
    }
    
    // Initial the canvas.
    print('Initial canvas related objects');
    canvas = document.getElementById("canvas");
    context = canvas.getContext('2d');
    
    // Initial the image
    print('Initial image related objects');
    originImage = document.getElementById("originImage");
    image = new Image();
    
    // Initial the filters
    print('Initial filters');
    filters = new Filters(canvas, context);
    
    // Initial the graffiti pencil
    print('Initial graffiti pencil');
    pencil = new Pencil(canvas, context);
    
    // Initial the toolbar switching
    print('Binding UI widgets events');
    initUITools();
    
    // Initial the sample gallery
    print('Initial the sample gallery');
    initSampleGallery(12); // Sample image num is 12 in current.
    
    // Initial the file system access
    print('Initial the tree view of file browser');
    if (browser.initialFileBrowser) {
        print('Trying to initial the file browser - ' + browser.type);
        browser.initialFileBrowser();
    } else {
        printError({message: 'Web browser does not support file system access'});
        $('div[data-id="browserFooter"]').hide(); // Hide footer in browser page.
    }
};
$(document).ready(init);

/*
 * OS Specific features.
 */ 

var DefaultBrowser = function() {
	this.type = 'Default';
};

DefaultBrowser.prototype.getScreenSize = function() {
	if(document.body.clientHeight) {
		return [document.body.clientWidth, document.body.clientHeight];
	} 
	
	if (document.documentElement.cilentWidth) {
		return [
		    document.documentElement.clientWidth,
		    document.documentElement.clientHeight
		];
	}
};

var TizenBrowser = function() {
	this.type = 'Tizen';
	
	// default absolute path
	this.mediaPath = "/opt/media/";
};

TizenBrowser.prototype.initialFileBrowser = function() {
    this.expandFS(document.getElementById("images"));
    $("#tree").treeview();
    $('#tree .folder').trigger('click');
};

TizenBrowser.prototype.getScreenSize = function() {
	print('TizenBrowser:getScreenSize - Start getting screen size.');
	
	
	if(document.body.clientHeight) {
		return [document.body.clientWidth, document.body.clientHeight];
	} 
	
	if (document.documentElement.cilentWidth) {
		return [
		    document.documentElement.clientWidth,
		    document.documentElement.clientHeight
		];
	}
	
	/* Buggy here */
	
	// Default screen size
	var screenSize = [720, 1024];
	
	var onSuccess = function (display) {
		print('Screen resolutionWidth is - ' + display.resolutionWidth);
		print('Screen resolutionHeight is - ' + display.resolutionHeight);
		screenSize = [display.resolutionWidth, display.resolutionHeight];
		return screenSize;
	};
	
	var onError = function (error) {
		printError(error);
		return screenSize;
	};
	
	tizen.systeminfo.getPropertyValue("Display", onSuccess, onError);
};


/*
 * File APIs of Tizen process.
 * Stolen from main.js of FileSystem Sample code.
 */

/**
 * The first char is uppercase in the path of the target.
 * If first char is lowercase, replace to uppercase.
 * @param DOMString imageFullpath
 * @returns DOMString imageFullpathOfTheTarget
 */
TizenBrowser.prototype.getFilePath = function(fullPath) {
    // change to Physical directory path
    var splitResult = fullPath.split('/');
    var prepath = splitResult[0];
    if (prepath == "images") {
        return this.mediaPath + fullPath.replace("images", "Images");
    } else if (prepath == "music") {
        return this.mediaPath + fullPath.replace("music", "Music");
    } else if (prepath == "documents") {
        return this.mediaPath + fullPath.replace("documents", "Documents");
    } else if (prepath == "downloads") {
        return this.mediaPath + fullPath.replace("downloads", "Downloads");
    } else {
        return this.mediaPath + fullPath;
    }
};

/**
 * Resolves a location to a File handle.
 * @param Element ElementOfVirtualRoot
 */

TizenBrowser.prototype.expandFS = function(id) {
    tizen.filesystem.resolve(
        id.id, //location
        function(dir) { // successCallback
            dir.listFiles(
                // successCallback : Returns the list of all files in this directory.
                function(files) {
                    var container = document.getElementById(id.id); // current path ex) music
                    var containerLocation = id.id; // full path ex) music/Music
                    for ( var i = 0; i < files.length; i++) {
                        if (files[i].isDirectory === true) {
                            /**
                             *  <li><span class="folder">current path</span>
                             *        <ul id="full path">
                             *        </ul>
                             *  </li>
                             */
                            if (files[i].name != "") {
                                var dirliNode = document.createElement('li');
                                var dirspanNode = document.createElement('span');
                                dirspanNode.setAttribute("class", "folder");
                                dirspanNode.innerHTML = files[i].name;
                                var dirulNode = document.createElement('ul');
                                dirulNode.setAttribute("id", containerLocation + "/" + files[i].name);
                                // NODE append
                                container.appendChild(dirliNode);
                                dirliNode.appendChild(dirspanNode);
                                dirspanNode.appendChild(dirulNode);
                                // expand recursive
                                browser.expandFS(dirulNode);
                            }
                        } else if (files[i].isFile === true) {
                            /**
                             *   <li><span class="file">file name</span></li>
                             */
                            var fileliNode = document.createElement('li');
                            var filespanNode = document.createElement('span');
                            filespanNode.setAttribute("class", "file");
                            // file name
                            filespanNode.innerHTML = files[i].name;
                            // file image
                            if (filespanNode.innerHTML.search(/.jpg/i) != -1) {
                                filespanNode.setAttribute("id", "jpg");
                                filespanNode.setAttribute("onclick", "moveImageToEditor('" + browser.getFilePath(files[i].fullPath) + "')");
                            } else if (filespanNode.innerHTML.search(/.png/i) != -1) {
                                filespanNode.setAttribute("id", "png");
                                filespanNode.setAttribute("onclick", "moveImageToEditor('" + browser.getFilePath(files[i].fullPath) + "')");
                            } else if (filespanNode.innerHTML.search(/.pdf/i) != -1) {
                                filespanNode.setAttribute("id", "pdf");
                                // nothing
                            } else if (filespanNode.innerHTML.search(/.txt/i) != -1) {
                                filespanNode.setAttribute("id", "txt");
                                // nothing
                            } else if (filespanNode.innerHTML.search(/.doc/i) != -1) {
                                filespanNode.setAttribute("id", "doc");
                                // nothing
                            } else if (filespanNode.innerHTML.search(/.mp3/i) != -1) {
                                filespanNode.setAttribute("id", "mp3");
                                filespanNode.setAttribute("onclick", "moveAudio('" + files[i].fullPath + "')");
                            } else if (filespanNode.innerHTML.search(/.mp4/i) != -1) {
                                filespanNode.setAttribute("id", "mp4");
                                filespanNode.setAttribute("onclick", "moveVideo('" + files[i].fullPath + "')");
                            } else if (filespanNode.innerHTML.search(/.xls/i) != -1) {
                                filespanNode.setAttribute("id", "xls");
                                // nothing
                            }
                            // NODE append
                            fileliNode.appendChild(filespanNode);
                            container.appendChild(fileliNode);
                        }
                    }
                },//end listFiles() successCallback
                printError // end listFiles() errorCallback
            );//end listFiles()
        },//end resolve() successCallback
        printError, // errorCallback
        'r' // FileMode
    );//end resolve()
};

/**
 * Load image with FileReader (jpg, png)
 * @param DOMString imagePath
 */

function loadImage(fullPath) {
	print('Loading image - ' + fullPath);
	
	originImage.removeAttribute('height');
	originImage.removeAttribute('width');
	
	originImage.onload = function() {
        print('The original size of image is - ' + this.height + 'x' + this.width);

		
        screenWidth = browser.getScreenSize()[0];

        // Set the size of image
        this.height = Math.round(this.height * screenWidth / this.width);
        this.width = screenWidth;
        
        $('div#editorContent').css({
        	'width': this.width, 'height': this.height
        });
        
        print('The image will resize to - ' + this.height + 'x' + this.width);

        // Set the image to image and canvas
        restoreImage();
    };
    originImage.src = fullPath;
}

function restoreImage() {
	// Show the image element
	originImage.style.display = 'block';
	
	// Set the image to image object
	print('Start to set the image to Image object - ' + originImage.src);
    image.removeAttribute('width');
    image.removeAttribute('height');
    image.width = originImage.width;
    image.height = originImage.height;
    image.src = originImage.src;
	
    // Draw the image to canvas
	print('Start to draw image to canvas - ' + originImage.src);
    canvas.width = originImage.width;
    canvas.height = originImage.height;
    context.drawImage(originImage, 0, 0, originImage.width, originImage.height);
    
    // Hide the image element
    originImage.style.display = 'none';
    
    // Remove the decorations
    clearDecorations();
    
    // Remove the borders
    clearBorders();
}

/**
 * Move Image Page (jpg, png)
 * @param DOMString imagePath
 */
function moveImageToEditor (fullPath) {
	print('Move image to editor - ' + fullPath);
	
    // var fileName = getFileName(ImageSource);
    // $('#imageName').html(fileName);
    
    var reader = new FileReader();
    reader.onload = (function(fullPath) {
        loadImage(fullPath);
    })(fullPath);
    reader.readAsDataURL(fullPath);
    
    $.mobile.changePage('#editor');
    
    // FIXME: Remove JQuery Mobile automation works.
    $('div#editor > div[data-role="footer"] > div#tools > div.noJQMStyle').find('*[class^="ui-"]').each(function(index, element) {
        var classes = element.className.toString().split(' ');
        newClass = [];
        for (var i=0; i<classes.length; i++) {
            var cls = classes[i];
            if (!cls.match(/^ui-/)) {
                newClass.append(cls);
            }
        }
        element.className = newClass.join(' ');
    });
}


function saveImage() {
	if(browser.type == 'Tizen') {
		alert('The feature is not implemented yet');
		return false;
	}
    window.open(canvas.toDataURL('image/png'));
}

function clearDecorations () {
	// Clear old decorations
	$('div#editorContent > div.decoration').remove();
}

function putDecoration(img_path) {
	// Create the elements
	var container = $('<div>').attr('class', 'decoration');
	var img = $('<img>').attr('src', img_path).click(
		function(e) {
			$('.decorControl').hide();
			$(this).parent().find('.decorControl').show();
		}
	);
	
	var closeBtn = $('<a>').attr({
		'class': 'decorControl closeBtn', 'data-icon': "delete",
		'data-iconpos': "notext"
	}).click(
		function(e) { $(this).parent().remove(); }
	).css({'display': 'none'});
	closeBtn.button({'refresh': true});
	container.append(closeBtn);
	container.append(img);
	
	// Bindding 
	// img.resizable();
	container.draggable();
		
	putDecorations.push(container);
	$('div#editor > div#editorContent').append(container);
}

function clearBorders () {
	// Clear old borders
	$('div#editorContent > img.border').remove();
	$('div#editorContent > img.corner').remove();
}

function setBorder (borderNo) {
	// Clear old borders
	clearBorders();
	
	// Initial the borders
	var borders = [];
	
	// Generate the corner elements
	for (var i = 1; i <= 4; i++) {
		var element = $('<img>').attr({
			'id': 'corner' + i,
			'class': 'corner',
			'src': './res/borders/' + borderNo + '/corner.png'
		});
		borders.push(element);
	}
	
	// Generate the border elements
	for (var i = 1; i <= 4; i++) {
		var element = $('<img>').attr({
			'id': 'border' + i,
			'class': 'border',
			'src': './res/borders/' + borderNo + '/border.png'
		});
		
		switch(i) {
			case 1:
				element.css('width', canvas.width);
				break;
			case 2:
				// FIXME: I don't know why, but it works.
				element.css({'width': canvas.height, 'top': canvas.width/2-50 + 'px', 'left': canvas.width/2-50 + 'px'});
				break;
			case 3:
				element.css('width', canvas.width);
				break;
			case 4:
				// FIXME: I don't know why, but it works.
				element.css({'width': canvas.height, 'top': canvas.width/2-50 + 'px', 'right': canvas.width/2-50 + 'px'});
				break;
		}
		
		borders.push(element);
	}

	// Add the border to container
	for (i = 0; i < borders.length; i++) {
		$('#editorContent').append(borders[i]);
	}
}

/**
 * MsgPrintCallback - This callback may be used in those functions that only require to print out the messages.
 * @param WebAPIMessage message
 */

function print(msg) {
	if(debug && window.console) {
		console.log("> " + msg);
	}
}

/**
 * ErrorCallback - This callback may be used in those functions that only require an error as input parameter in the error callback.
 * @param WebAPIError error
 */

function printError(e) {
	if(window.console)
		console.log("- " + e.message);
}


/*
* Resize canvas image
* Stolen from http://stackoverflow.com/questions/2303690/resizing-an-image-in-an-html5-canvas
*/

//returns a function that calculates lanczos weight
function lanczosCreate(lobes) {
	return function (x) {
		if (x > lobes)
		return 0;
		x *= Math.PI;
		if (Math.abs(x) < 1e-16)
		return 1;
		var xx = x / lobes;
		return Math.sin(x) * Math.sin(xx) / x / xx;
	};
}

//elem: canvas element, img: image element, sx: scaled width, lobes: kernel radius
function thumbnailer (elem, img, sx, lobes) { 
	this.canvas = elem;
	elem.width = img.width;
	elem.height = img.height;
	elem.style.display = "none";
	this.ctx = elem.getContext("2d");
	this.ctx.drawImage(img, 0, 0);
	this.img = img;
	this.src = this.ctx.getImageData(0, 0, img.width, img.height);
	this.dest = {
		width: sx,
		height: Math.round(img.height * sx / img.width)
	};
	this.dest.data = new Array(this.dest.width * this.dest.height * 3);
	this.lanczos = lanczosCreate(lobes);
	this.ratio = img.width / sx;
	this.rcp_ratio = 2 / this.ratio;
	this.range2 = Math.ceil(this.ratio * lobes / 2);
	this.cacheLanc = {};
	this.center = {};
	this.icenter = {};
	setTimeout(this.process1, 0, this, 0);
}

thumbnailer.prototype.process1 = function(self, u) {
	print('Start thumbnail generation by process1 - ' + u);
	
	self.center.x = (u + 0.5) * self.ratio;
	self.icenter.x = Math.floor(self.center.x);
	for (var v = 0; v < self.dest.height; v++) {
		self.center.y = (v + 0.5) * self.ratio;
		self.icenter.y = Math.floor(self.center.y);
		var a, r, g, b, idx;
		a = r = g = b = 0;
		for (var i = self.icenter.x - self.range2; i <= self.icenter.x + self.range2; i++) {
			if (i < 0 || i >= self.src.width) 
			    continue;
			var f_x = Math.floor(1000 * Math.abs(i - self.center.x));
			if (!self.cacheLanc[f_x]) 
			self.cacheLanc[f_x] = {};
			for (var j = self.icenter.y - self.range2; j <= self.icenter.y + self.range2; j++) {
				if (j < 0 || j >= self.src.height) 
				    continue;
				var f_y = Math.floor(1000 * Math.abs(j - self.center.y));
				if (self.cacheLanc[f_x][f_y] === undefined) 
				self.cacheLanc[f_x][f_y] = self.lanczos(Math.sqrt(Math.pow(f_x * self.rcp_ratio, 2) + Math.pow(f_y * self.rcp_ratio, 2)) / 1000);
				weight = self.cacheLanc[f_x][f_y];
				if (weight > 0) {
					idx = (j * self.src.width + i) * 4;
					a += weight;
					r += weight * self.src.data[idx];
					g += weight * self.src.data[idx + 1];
					b += weight * self.src.data[idx + 2];
				}
			}
		}
		idx = (v * self.dest.width + u) * 3;
		self.dest.data[idx] = r / a;
		self.dest.data[idx + 1] = g / a;
		self.dest.data[idx + 2] = b / a;
	}

	if (++u < self.dest.width) 
	    setTimeout(self.process1, 0, self, u);
	else 
	    setTimeout(self.process2, 0, self);
};

thumbnailer.prototype.process2 = function(self) {
	print('Start thumbnail generation by process2 - ');
	
	self.canvas.width = self.dest.width;
	self.canvas.height = self.dest.height;
	self.ctx.drawImage(self.img, 0, 0);
	self.src = self.ctx.getImageData(0, 0, self.dest.width, self.dest.height);
	var idx, idx2;
	for (var i = 0; i < self.dest.width; i++) {
		for (var j = 0; j < self.dest.height; j++) {
			idx = (j * self.dest.width + i) * 3;
			idx2 = (j * self.dest.width + i) * 4;
			self.src.data[idx2] = self.dest.data[idx];
			self.src.data[idx2 + 1] = self.dest.data[idx + 1];
			self.src.data[idx2 + 2] = self.dest.data[idx + 2];
		}
	}
	self.ctx.putImageData(self.src, 0, 0);
	self.canvas.style.display = "block";
};

/*
 * Filters
 * 
 * Referenced from http://www.html5rocks.com/en/tutorials/canvas/imagefilters/
 * 
 */

var Filters = function(canvas, context) {
	this.canvas = canvas;
	this.context = context;
	
    this.tmpCanvas = document.createElement('canvas');
    this.tmpCtx = this.tmpCanvas.getContext('2d');
    
    this.convoluteArguments = {
        'sharpen':  [  0, -1,  0, -1,  5, -1, 0, -1,  0 ],
        'blur':   [ 1/9, 1/9, 1/9, 1/9, 1/9, 1/9, 1/9, 1/9, 1/9 ]
    };
    
    this.adjustment = ['edit'];
    this.effects = [
        ['grayscale', 'normal', 'Gray'],
        ['threshold', 'normal', 'B&W'],
        ['sharpen', 'convolute', 'Sharp'],
        ['blur', 'convolute', 'Blur'],
        ['sobel', 'normal', 'Neon']
    ];
};

Filters.prototype.getPixels = function(image) {
	// context.drawImage(image);
	return this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
};

Filters.prototype.getCanvas = function(w, h) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
};

Filters.prototype.filterImage = function(filter, image, var_args) {
	var args = [this.getPixels(image)];
	for (var i=2; i<arguments.length; i++) {
	    args.push(arguments[i]);
	}
	return filter.apply(null, args);
};

Filters.prototype.drawFilterImage = function(filter, image, var_args) {
	filteredImageData = this.filterImage(filter, image, var_args);
	
	return this.context.putImageData(filteredImageData, 0, 0);
};


/*
 * Normal filters
 */

Filters.prototype.grayscale = function(pixels, args) {
    var d = pixels.data;
    for (var i=0; i<d.length; i+=4) {
	    var r = d[i];
	    var g = d[i+1];
	    var b = d[i+2];
	    // CIE luminance for the RGB
	    // The human eye is bad at seeing red and blue, so we de-emphasize them.
	    var v = 0.2126*r + 0.7152*g + 0.0722*b;
	    d[i] = d[i+1] = d[i+2] = v;
    }
    return pixels;
};

Filters.prototype.brightness = function(pixels, adjustment) {
	if(!adjustment)
		adjustment = 40;
    var d = pixels.data;
    for (var i=0; i<d.length; i+=4) {
	    d[i] += adjustment;
	    d[i+1] += adjustment;
	    d[i+2] += adjustment;
    }
    return pixels;
};

Filters.prototype.threshold = function(pixels, threshold) {
	if(!threshold)
		threshold = 128;
	
    var d = pixels.data;
    for (var i=0; i<d.length; i+=4) {
	    var r = d[i];
	    var g = d[i+1];
	    var b = d[i+2];
	    var v = (0.2126*r + 0.7152*g + 0.0722*b >= threshold) ? 255 : 0;
	    d[i] = d[i+1] = d[i+2] = v;
    }
    return pixels;
};

Filters.prototype.sobel = function(pixels) {
    // FIXME: Why here 'this' is DOMWindow in click event bindding, not Filter object?
	var grayscale = filters.filterImage(filters.grayscale, image);
	
	// Note that ImageData values are clamped between 0 and 255, so we need
	// to use a Float32Array for the gradient values because they
	// range between -255 and 255.
	
	var vertical = filters.convoluteFloat32(grayscale,
	  [ -1, 0, 1,
	    -2, 0, 2,
	    -1, 0, 1 ]);
	var horizontal = filters.convoluteFloat32(grayscale,
	  [ -1, -2, -1,
	     0,  0,  0,
	     1,  2,  1 ]);
	var final_image = filters.createImageData(vertical.width, vertical.height);
	
	for (var i=0; i<final_image.data.length; i+=4) {
	  // make the vertical gradient red
	  var v = Math.abs(vertical.data[i]);
	  final_image.data[i] = v;
	  // make the horizontal gradient green
	  var h = Math.abs(horizontal.data[i]);
	  final_image.data[i+1] = h;
	  // and mix in some blue for aesthetics
	  final_image.data[i+2] = (v+h)/4;
	  final_image.data[i+3] = 255; // opaque alpha
	}
	return final_image;
};

/*
 * Convolute filters
 */

Filters.prototype.createImageData = function(w,h) {
    return this.tmpCtx.createImageData(w,h);
};

Filters.prototype.convolute = function(pixels, weights, opaque) {
    var side = Math.round(Math.sqrt(weights.length));
    var halfSide = Math.floor(side/2);
    var src = pixels.data;
    var sw = pixels.width;
    var sh = pixels.height;
    // pad output by the convolution matrix
    var w = sw;
    var h = sh;
    
    // FIXME: Why here 'this' is DOMWindow in click event bindding, not Filter object?
    // var output = this.createImageData(w, h);
    var output = filters.createImageData(w, h);
    
    var dst = output.data;
    // go through the destination image pixels
    var alphaFac = opaque ? 1 : 0;
    for (var y=0; y<h; y++) {
        for (var x=0; x<w; x++) {
            var sy = y;
            var sx = x;
            var dstOff = (y*w+x)*4;
            // calculate the weighed sum of the source image pixels that
            // fall under the convolution matrix
            var r=0, g=0, b=0, a=0;
            for (var cy=0; cy<side; cy++) {
                for (var cx=0; cx<side; cx++) {
                    var scy = sy + cy - halfSide;
                    var scx = sx + cx - halfSide;
                    if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
                        var srcOff = (scy*sw+scx)*4;
                        var wt = weights[cy*side+cx];
                        r += src[srcOff] * wt;
                        g += src[srcOff+1] * wt;
                        b += src[srcOff+2] * wt;
                        a += src[srcOff+3] * wt;
                    }
                }
            }
            dst[dstOff] = r;
            dst[dstOff+1] = g;
            dst[dstOff+2] = b;
            dst[dstOff+3] = a + alphaFac*(255-a);
        }
    }
    return output;
};

Filters.prototype.convoluteFloat32 = function(pixels, weights, opaque) {
    var side = Math.round(Math.sqrt(weights.length));
    var halfSide = Math.floor(side/2);

    var src = pixels.data;
    var sw = pixels.width;
    var sh = pixels.height;

    var w = sw;
    var h = sh;
    
    if (!window.Float32Array)
        Float32Array = Array;
    
    var output = {
      width: w, height: h, data: new Float32Array(w*h*4)
    };
    var dst = output.data;

    var alphaFac = opaque ? 1 : 0;

    for (var y=0; y<h; y++) {
        for (var x=0; x<w; x++) {
            var sy = y;
            var sx = x;
            var dstOff = (y*w+x)*4;
            var r=0, g=0, b=0, a=0;
            for (var cy=0; cy<side; cy++) {
                for (var cx=0; cx<side; cx++) {
                    var scy = Math.min(sh-1, Math.max(0, sy + cy - halfSide));
                    var scx = Math.min(sw-1, Math.max(0, sx + cx - halfSide));
                    var srcOff = (scy*sw+scx)*4;
                    var wt = weights[cy*side+cx];
                    r += src[srcOff] * wt;
                    g += src[srcOff+1] * wt;
                    b += src[srcOff+2] * wt;
                    a += src[srcOff+3] * wt;
                }
            }
            dst[dstOff] = r;
            dst[dstOff+1] = g;
            dst[dstOff+2] = b;
            dst[dstOff+3] = a + alphaFac*(255-a);
        }
    }
    return output;
};

/*
 * Draw function
 * 
 * Referenced from http://dev.opera.com/articles/view/html5-canvas-painting/
 * 
 */


//The general-purpose event handler. This function just determines the mouse 
//position relative to the canvas element.

var ev_canvas = function (ev) {
	var triggerEvents = ['mousedown', 'mousemove', 'touchstart', 'touchmove'];
	ev = ev.originalEvent;
	if(triggerEvents.indexOf(ev.type) != -1) {
	    if (ev.targetTouches && (ev.targetTouches[0].pageX || ev.targetTouches[0].pageX == 0)) { // Mobile
	        ev._x = ev.targetTouches[0].pageX;
	        ev._y = ev.targetTouches[0].pageY;
	    } else if (ev.offsetX || ev.offsetX == 0) { // Desktop
	        ev._x = ev.offsetX;
	        ev._y = ev.offsetY;
		}
	}
    
    // Call the event handler of the tool.
    var func = pencil[ev.type];
    if (func) {
        func(ev);
    }
};

//This painting tool works like a drawing pencil which tracks the mouse 
// movements.
var Pencil = function(canvas, context) {
	this.canvas = $(canvas);
	this.context = context;
	
    this.started = false;
    this.color = 'red';
    
    this.enabled = false;
};

Pencil.prototype.bindCanvasEvents = function() {
	this.canvas.live('mousedown touchstart', ev_canvas);
	this.canvas.live('mousemove touchmove',  ev_canvas);
	this.canvas.live('mouseup touchend', ev_canvas);
};

// This is called when you start holding down the mouse button.
// This starts the pencil drawing.
Pencil.prototype.mousedown = function (ev) {
	print('Start drawing - Mouse/Finger down at - ' + ev._x + 'x' + ev._y);
    context.beginPath();
    context.moveTo(ev._x, ev._y);
    pencil.started = true;
};

// This function is called every time you move the mouse. Obviously, it only 
// draws if the tool.started state is set to true (when you are holding down 
// the mouse button).
Pencil.prototype.mousemove = function (ev) {
    if (pencil.started && pencil.enabled) {
        print('Drawing - Mouse/Finger move to - ' + ev._x + 'x' + ev._y);
        
        
        // Following code moved to line 142
        /*
        context.fillStyle = pencil.color;
        context.strokeStyle = pencil.color;
        */
        
        context.lineTo(ev._x, ev._y);
        context.stroke();
    }
};

// This is called when you release the mouse button.
Pencil.prototype.mouseup = function (ev) {
    if (pencil.started) {
        print('End drawing - Mouse/Finger up');

        pencil.mousemove(ev);
        pencil.started = false;
    }
};

Pencil.prototype.touchstart = function(ev) {
	return pencil.mousedown(ev);
};

Pencil.prototype.touchmove = function(ev) {
	return pencil.mousemove(ev);
};

Pencil.prototype.touchend = function(ev) {
	return pencil.mouseup(ev);
};
