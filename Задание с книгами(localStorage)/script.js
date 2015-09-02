function Book(data, id) {
	this.id = id;
	this.setParam(data);
}

Book.prototype = {
	setParam : function (data) {
		this.param = {
			title : data.title,
			author : data.author,
			year : parseInt(data.year),
			pages : parseInt(data.pages)
		}
		return this;
	},
	toJSON : function () {
		return this.param;
	}
}

Book.validate = (function () {
	var req = function (val) {
		if (!val) return "Обязательное поле";
	};
	var num = function (val) {
		if ( !isFinite(val) ) return "Значение должнобыть числом";
	};
	var year = function (val) {
		if (val < 868) return "Первая книга была напечатана в 868 году н. э.";
		if ( val > ( new Date() ).getFullYear() ) return "Ошибка! Книга из будущего!";
	};
	var fields = {
		title : [req],
		author : [req],
		pages : [req, num],
		year : [req, num, year]
	}

	return function (values) {
		var data = {isCorr: true}, message;
		for (var key in fields) {
			
			if (values[key] !== undefined) {
				for (var i = 0; i < fields[key].length; i++) {
					message = fields[key][i](values[key]); 
					
					if (message) {
						data[key] = message;
						if (data.isCorr) data.isCorr = false; 
						break;
					};

				}
			}

		}
		return data;
	}
}());

function Library() {
	var local = localStorage;
	var nameTable = "Books";
	var keyIds;
	this._k = function (path) {
		return nameTable + "." + path;
	}

	keyIds = this._k("ids");

	this.isEmpty = function () {
		return (local[keyIds] === ".") ||
				(local[keyIds] === undefined);
	}

	this.isExist =function (id) {
		if ( this.isEmpty() ) return false;
		return local[keyIds].indexOf('.' + id + '.') != -1;
	}

	this.getAllIndex = function () {
		if ( !this.isEmpty() ) return local[keyIds].match(/\d+/g);
		return [];
	}

	this.newIndex = function () {
		if ( this.isEmpty() ) return 0;
		return ++local[keyIds].match(/\.(\d+)\.$/)[1]; 
	}

	this.saveBook = function (book) {
		local[ this._k(book.id) ] = JSON.stringify(book);
	}

	this.addBook = function (book) {
		var id = this.newIndex();
		
		if (local[keyIds] === undefined) {
			local[keyIds] = ".";
		};

		local[keyIds] += id + ".";
		book.id = id;
		this.saveBook(book);
		return book;
	}

	this.getBook = function (id) {
		return new Book(JSON.parse(local[ this._k(id) ]), id);
	} 

	this.remBook = function (id) {
		
		if ( this.isExist(id) ) {
			local[keyIds] = local[keyIds].replace("." + id + ".", ".");
			local.removeItem( this._k(id) );
			return true;
		}

		return false;
	}
}

/**/
function View(model) {
	this.form = $("#left .form");
	this.books = $("#right .books");
	this.tmplBook = $("#movieTmpl");

	var $fields = this.form.find("input");

	this.fields = {
		title : $fields.filter("#title"),
		author: $fields.filter("#author"),
		year: $fields.filter("#year"),
		pages: $fields.filter("#pages")
	}

	this.btnSave = this.form.find("button#save");
	this.btnCancel = this.form.find("button#cancel");
	
	this.resetForm = function () {
		$fields.val("");
		this.form.find("p.error").text("");
		this.btnCancel.hide();
	}


	this.showBook = function (book) {
		this.tmplBook.tmpl(book).prependTo(this.books);
	}

	this.addFieldMessage = function (field, message) {
			field.next("p.error").text(message ? message : "");
	}

	this.getFormValue = function () {
		var data = {};
		for (var key in this.fields) {
			data[key] = this.fields[key].val();
		}
		return data;
	}

	this.setFormValue = function (data) {
		for (var key in this.fields) {
			this.fields[key].val(data[key] ? data[key] : "");
		}
	}

	this.setFormMessage = function (messages) {
		for (var key in this.fields) {
			this.addFieldMessage(this.fields[key], messages[key]);
		}
	}

	this.readyEdit = function (book) {
		this.resetForm();
		this.btnCancel.show();
		this.setFormValue(book.param);
	}


	this.updateItem = function (item, book) {
		item.replaceWith(this.tmplBook.tmpl(book));
	}
}

function Controller(model, view) {
	var editable = null;
	var ids = model.getAllIndex();
	for (var i = 0; i < ids.length; i++) {
		view.showBook( model.getBook(ids[i]) );
	}

	view.btnSave.click( function () {
		var values = view.getFormValue();
		var mes = Book.validate(values);
		
		view.setFormMessage(mes);
		
		if (mes.isCorr) {

			if (editable) {
				var book = model.getBook( editable.attr("data-id") );
				book.setParam(values);
				model.saveBook(book);
				view.updateItem(editable, book);
				editable = null;
			} else {
				view.showBook( model.addBook( new Book(values) ) );
			};
			
			view.resetForm();
		}

	} );

	view.btnCancel.click( function () {
		view.resetForm();
		editable.find(".del").show();
		editable = null;
	} );

	view.books.on('click', "a.button", function () {
		var item = $(this).closest("li");
		var id = item.attr("data-id");

		if ( $(this).is(".del") ) {
			model.remBook(id);
			item.slideUp(200, function () {
				$(this).remove();
			});
		} else if ( $(this).is(".edit") ) {
			view.readyEdit( model.getBook(id) );
			editable = item;
			editable.find(".del").hide();		
		};

		return false;

	} );
	
}

$( function () {
	var model = new Library();
	var view = new View(model);
	Controller(model, view);
} );