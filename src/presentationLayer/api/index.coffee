restify = require 'restify'
async = require 'async'
fs = require 'fs'
Path = require 'path'
Url = require 'url'

engine = {}
module.exports = (env) ->
	init: () ->
		env.server.opts /^\/api\/.*$/, (req, res, next) =>
			res.setHeader "Access-Control-Allow-Origin", "*"
			res.setHeader "Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"
			res.setHeader "Access-Control-Allow-Headers", "Authorization, Content-Type"
			res.send(200);

		env.server.use (req, res, next) =>
			if (req.url.match(/^\/api\/.*$/))
				res.setHeader "Access-Control-Allow-Origin", "*"
				res.setHeader "Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"
				res.setHeader "Access-Control-Allow-Headers", "Authorization, Content-Type"
			next()

	registerWs: () ->
		# create an application
		env.server.post '/api/apps', env.pluginsEngine.plugin['auth'].needed, env.hooks["api_create_app_restriction"][0], (req, res, next) =>
			env.data.apps.create req.body, req.user, (error, result) =>
				return next(error) if error
				env.events.emit 'app.create', req.user, result
				res.send name:result.name, key:result.key, domains:result.domains
				next()

		# get infos of an app
		env.server.get '/api/apps/:key', env.pluginsEngine.plugin['auth'].needed, (req, res, next) =>
			async.parallel [
				(cb) => env.data.apps.get req.params.key, cb
				(cb) => env.data.apps.getDomains req.params.key, cb
				(cb) => env.data.apps.getKeysets req.params.key, cb
				(cb) => env.data.apps.getBackend req.params.key, cb
			], (e, r) =>
				return next(e) if e
				res.send name:r[0].name, key:r[0].key, secret:r[0].secret, owner:r[0].owner, date:r[0].date, domains:r[1], keysets:r[2], backend:r[3]
				next()

		# update infos of an app
		env.server.post '/api/apps/:key', env.pluginsEngine.plugin['auth'].needed, (req, res, next) =>
			env.data.apps.update req.params.key, req.body, env.send(res,next)

		# remove an app
		env.server.del '/api/apps/:key', env.pluginsEngine.plugin['auth'].needed, (req, res, next) =>
			env.data.apps.get req.params.key, (e, app) =>
				return next(e) if e
				env.data.apps.remove req.params.key, (e, r) =>
					return next(e) if e
					env.events.emit 'app.remove', req.user, app
					res.send check.nullv
					next()

		# reset the public key of an app
		env.server.post '/api/apps/:key/reset', env.pluginsEngine.plugin['auth'].needed, (req, res, next) =>
			env.data.apps.resetKey req.params.key, env.send(res,next)	

		# list valid domains for an app
		env.server.get '/api/apps/:key/domains', env.pluginsEngine.plugin['auth'].needed, (req, res, next) =>
			env.data.apps.getDomains req.params.key, env.send(res,next)

		# update valid domains list for an app
		env.server.post '/api/apps/:key/domains', env.pluginsEngine.plugin['auth'].needed, (req, res, next) =>
			env.data.apps.updateDomains req.params.key, req.body.domains, env.send(res,next)

		# add a valid domain for an app
		env.server.post '/api/apps/:key/domains/:domain', env.pluginsEngine.plugin['auth'].needed, (req, res, next) =>
			env.data.apps.addDomain req.params.key, req.params.domain, env.send(res,next)

		# remove a valid domain for an app
		env.server.del '/api/apps/:key/domains/:domain', env.pluginsEngine.plugin['auth'].needed, (req, res, next) =>
			env.data.apps.remDomain req.params.key, req.params.domain, env.send(res,next)

		# list keysets (provider names) for an app
		env.server.get '/api/apps/:key/keysets', env.pluginsEngine.plugin['auth'].needed, (req, res, next) =>
			env.data.apps.getKeysets req.params.key, env.send(res,next)

		# get a keyset for an app and a provider
		env.server.get '/api/apps/:key/keysets/:provider', env.pluginsEngine.plugin['auth'].needed, (req, res, next) =>
			env.data.apps.getKeyset req.params.key, req.params.provider, env.send(res,next)

		# add or update a keyset for an app and a provider
		env.server.post '/api/apps/:key/keysets/:provider', env.pluginsEngine.plugin['auth'].needed, (req, res, next) =>
			env.data.apps.addKeyset req.params.key, req.params.provider, req.body, env.send(res,next)

		# remove a keyset for a app and a provider
		env.server.del '/api/apps/:key/keysets/:provider', env.pluginsEngine.plugin['auth'].needed, (req, res, next) =>
			env.data.apps.remKeyset req.params.key, req.params.provider, env.send(res,next)

		# get providers list
		env.server.get '/api/providers', env.bootPathCache(), (req, res, next) =>
			env.data.providers.getList env.send(res,next)

		# get the backend of an app
		env.server.get '/api/apps/:key/backend', env.pluginsEngine.plugin['auth'].needed, (req, res, next) =>
			env.data.apps.getBackend req.params.key, env.send(res,next)

		# set or update the backend for an app
		env.server.post '/api/apps/:key/backend/:backend', env.pluginsEngine.plugin['auth'].needed, (req, res, next) =>
			env.data.apps.setBackend req.params.key, req.params.backend, req.body, env.send(res,next)

		# remove a backend from an app
		env.server.del '/api/apps/:key/backend', env.pluginsEngine.plugin['auth'].needed, (req, res, next) =>
			env.data.apps.remBackend req.params.key, env.send(res,next)

		# get a provider config
		env.server.get '/api/providers/:provider', env.bootPathCache(), env.hooks["api_cors_middleware"][0], (req, res, next) =>
			if req.query.extend
				env.data.providers.getExtended req.params.provider, env.send(res,next)
			else
				env.data.providers.get req.params.provider, env.send(res,next)

		# get a provider config's extras
		env.server.get '/api/providers/:provider/settings', env.bootPathCache(), env.hooks["api_cors_middleware"][0], (req, res, next) =>
			env.data.providers.getSettings req.params.provider, env.send(res,next)

		# get the provider me.json mapping configuration
		env.server.get '/api/providers/:provider/user-mapping', env.bootPathCache(), env.hooks["api_cors_middleware"][0], (req, res, next) =>
			env.data.providers.getMeMapping req.params.provider, env.send(res,next)

		# get a provider logo
		env.server.get '/api/providers/:provider/logo', env.bootPathCache(), ((req, res, next) =>
				fs.exists Path.normalize(env.config.rootdir + '/providers/' + req.params.provider + '/logo.png'), (exists) =>
					if not exists
						req.params.provider = 'default'
					req.url = '/' + req.params.provider + '/logo.png'
					req._url = Url.parse req.url
					req._path = req._url._path
					next()
			), restify.serveStatic
				directory: env.config.rootdir + '/providers'
				maxAge: env.config.cacheTime

		# get a provider file
		env.server.get '/api/providers/:provider/:file', env.bootPathCache(), ((req, res, next) =>
				req.url = '/' + req.params.provider + '/' + req.params.file
				req._url = Url.parse req.url
				req._path = req._url._path
				next()
			), restify.serveStatic
				directory: env.config.rootdir + '/providers'
				maxAge: env.config.cacheTime

		# get the plugins list
		env.server.get '/api/plugins', env.pluginsEngine.plugin['auth'].needed, (req, res, next) =>
			env.pluginsEngine.list (err, list) =>
				return next(err) if err
				res.send list
				next()

		# get host_url
		env.server.get '/api/host_url', env.pluginsEngine.plugin['auth'].needed, (req, res, next) =>
			res.send env.config.host_url
			next()