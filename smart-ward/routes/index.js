
exports.admin = new Object();

exports.index = function(req, res){
  res.render('index', { title: 'Express', logged_in: req.session.user ? true : false });
};

exports.admin.index = function(req, res){
	res.render('admin/index');
}
