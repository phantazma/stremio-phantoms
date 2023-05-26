const { addonBuilder, serveHTTP, publishToCentral }  = require('stremio-addon-sdk')
const https = require('https');
const chromium = require('chrome-aws-lambda');

//Proxy to remove
//const proxy  = 'http://192.168.10.135:8080';
//const proxy = 'https://157.167.107.150';

var m3u8list = [];

const builder = new addonBuilder({
    id: 'org.phantazma',
    version: '1.18.0',
    name: 'Phantom',
	//icon: "https://pics.freeicons.io/uploads/icons/png/4430291111679029297-256.png", 
    //background: "URL to 1024x786 png/jpg background",
    catalogs: [],
    resources: ['stream'],
    types: ['movie','series'],
    idPrefixes: ['tt']
});



builder.defineStreamHandler(function(args) {

//function defineStreamHandler(){

	var urlTable = [];

	const type = args.type;
	var id = args.id;
	var season = -1;
	var episode = -1;
	
	if(id.indexOf(":") !== -1){
		var splitted = id.split(":");
		id = splitted[0];
		season = splitted[1];
		episode = splitted[2];
	}
	
	 return new Promise((resolve, reject) => {
		 
		try {
		 	CheckIMDB(id,type,season,episode, function(urls) {		
		if (urls.length > 0) {		
				urlTable = urls;

				var result = JSON.parse(urls);
			
				resolve({streams: result});				
			} 			
		}) 
		} catch (e) {
			resolve({streams: []});	
		}
		 
	
    });

	//return Promise.resolve({streams: urlTable});	

});
//}

function CheckIMDB(id,type,season,episode, callback){
	//https://cinemeta-live.strem.io/meta/series/tt11269130.json
	const options0 = {
	  hostname: 'cinemeta-live.strem.io',
	  port: 443,
	  path: '/meta/'+ type + '/' + id + '.json',
	  method: 'GET',
	  rejectUnauthorized: false,
	  //proxy:proxy,
	};
		
	const req = https.request(options0, (res) => {
		let resAccum = '';
		res.on('data', chunk => {
			resAccum += chunk.toString();
		});

		res.on('end', () => {
			try {
				const data = JSON.parse(resAccum);
				
				CheckFromSource(data.meta.name,season,episode, function(urls) {
					callback(urls);

				});
			}catch(error){
				console.log(error);
				console.log(resAccum);
				callback([]);
			}
				
			
		});
		res.on('error', err => {console.log(err);callback([]);});
	});

	req.on('error', err => {console.log(err);callback([]);});
	req.end();
	
		
}
	
function CheckFromSource(name,season,episode, callback){
	
	const data = '{"search":"'+Buffer.from(name, 'utf-8').toString()+'"}'
	console.log(data);
	const options = {
	  hostname: 'empire-streaming.app',
	  port: 443,
	  path: '/api/views/search',
	  method: 'POST',
	  rejectUnauthorized: false,
	  //proxy:proxy,
	  headers: {
		'Content-Type': 'application/json;charset=UTF-8',
		'Content-Length': data.length,
		Cookie : '3swFCUaDnt92STU2gB.ClmAd4MTziobaGv1fXNPEMfo-1683882259-0-150',
	  }
	};
		
	const req = https.request(options, res => {
	  
		let data = '';

		res.on('end', () => {
			
			try{				
				var obj = JSON.parse(data);		
				var jsondata = obj.data.series;
				
				if(season ==-1){
					jsondata = obj.data.films;
				}
				
				var serieUrl = "";
					
				jsondata.forEach(function(serie) {
					
					var SerieName = serie.title;
					var SerieUrlPath = serie.urlPath;
					serieUrl = 	SerieUrlPath;
				});
				
				
				CheckFromUrl(serieUrl,season,episode, function(response) {
				callback(response);
				});
				
			}catch(error){
				callback([]);
				console.log(error);
				console.log(data);
			}
			
		});
		
		res.on('data', d => {
			//process.stdout.write(d);
			data += d;
			 
		});
	
	});
	
	req.on('error', error => {
	  console.error(error);
	  callback([]);
	});



	req.write(data);
	req.end();
	
}

function CheckFromUrl(url,season,episode,callback){
	
	const data2 = '{"saison":"1","episode":"2",}'
	
		const options2 = {
		  hostname: 'empire-streaming.app',
		  port: 443,
		  path: "/"+url,
		  method: 'POST',
		  rejectUnauthorized: false,
		  //proxy:proxy,
		  headers: {
			'Content-Type': 'application/json;charset=UTF-8',
			'Content-Length': 24,
			Cookie : '3swFCUaDnt92STU2gB.ClmAd4MTziobaGv1fXNPEMfo-1683882259-0-150',
			'Host' : 'empire-streaming.app'
		  }
		};
		
		const req2 = https.request(options2, res2 => {
			let ress = '';
			let mystream = [];
			let myversion = [];
			let	mytitles = [];
			let	myproviders = [];
			
			res2.on('end', () => {
			
				try{
				
					var arr = ress.split("const result = ")[1];
					var arr2 = arr.split("if(result){")[0];
					arr2 = arr2.trim().slice(0, -1);
									  
						if(season != -1){
							
							var tvshwos = JSON.parse(arr2);
					  
							  for(var attributename in tvshwos){
															
								if(attributename == season){
									
									tvshwos[attributename].forEach(function(tv) {
									var title = "";
									
									for(var attributename2 in tv){
										
										
										if(attributename2=="episode" && tv[attributename2]  != episode){										
											break;
										}
																		
										if(attributename2=="episode"){
											console.log("episode : "+tv[attributename2]);
										}
										if(attributename2=="title"){
											title = tv[attributename2];
										}
										
										if(attributename2=="video"){
											tv[attributename2].forEach(function(video) {
												var url = video.code;
												var thestream = {};
												thestream.url = url;
												thestream.version = video.version;
												thestream.title = title;
												thestream.provider = video.property;											
												mystream.push(thestream);
											});
										}								
									}
													
								});
								}
															  
							}
					  
						}else{
						
						var movies = JSON.parse(arr2);
						
						movies.forEach(function(movie) {
							
							var url = movie.code;
								
							var thestream = {};
							thestream.url = url;
							thestream.version = movie.version;
							thestream.title = movie.title;
							thestream.provider = movie.property;							
							mystream.push(thestream);
						});
						
						}
						
						console.log(mystream);
					  
						getSblongvuUrl2(mystream, function(response) {
							callback(response);
						});
						  
					  
				}catch(error){
					callback([]);
					console.log(error);
					console.log(ress);
				}	

			});
			  
				res2.on('data', d => {
					//process.stdout.write(d);
					ress += d;
					 
				});
			
			
			
		});
		
		req2.on('error', error => {
			console.error(error);
			callback([]);
		});
			
		req2.write(data2);
		req2.end();
	
}

async function getSblongvuUrl2(urls,callback){
	
	"m3u8list",m3u8list); = [];
	
	const scrapeWebsite = async (url) => {

	var theUrl = "375664356a494546326c4b797c7c6e756577776778623171737/";

	theUrl = theUrl+Buffer.from('AAAAAAAAAAAA||'+url+'||AAAAAAAAAAAA||streamsb', 'utf8').toString('hex');

      const result = [];  
         result.push(theUrl);
		console.log("theUrl"+theUrl);
		 FetchLoop(theUrl,url);
        	
      return result;
    };

	
    const scrapePromises = urls.map((website) => scrapeWebsite(website.url));
    const results = await Promise.all(scrapePromises);
	
	console.log("m3u8list"+m3u8list);
	
    callback(Finished(urls));
	
	
}

async function getSblongvuUrl(urls,callback){
	
	m3u8list = [];

 try {
	 
    browser = await chromium.puppeteer.launch({
       executablePath: await chromium.executablePath,   
      args: [
        //'--proxy-server=http://192.168.10.135:8080',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--no-first-run',
        '--no-sandbox',
        '--no-zygote',
        '--single-process',
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list',
        '--enable-features=NetworkService'
      ],
      headless: true,
      ignoreHTTPSErrors: true,
      acceptInsecureCerts: true
    });
	

    const scrapeWebsite = async (url) => {
      const page = await browser.newPage();
      const result = [];

      await page.setRequestInterception(true);

      page.on('request', (request) => {
        if (request.url().indexOf("375664356a494546326c4b797c7c6e756577776778623171737") !== -1) {
          result.push(request.url().split(".com/")[1]);
		  FetchLoop(request.url().split(".com/")[1]);
        }
        request.continue();
      });

      await page.goto(url);

        try {
		  await page.waitForNavigation({timeout: 5000});
		 
			} catch (e) {
			if (e instanceof puppeteer.errors.TimeoutError) {
			// Do something if this is a timeout.
			  }
		}

      await page.close();

      return result;
    };


    const scrapePromises = urls.map((website) => scrapeWebsite(website.url));

    const results = await Promise.all(scrapePromises);

    await browser.close();

    callback(Finished(urls));
	
  } catch (error) {
    console.error('Error occurred during scraping:', error);
	callback([]);
  }

}


function FetchLoop(stream,url2){
	
		const options3 = {
			hostname: 'sblongvu.com',
			port: 443,
			path: "/"+stream,
			method: 'GET',
			rejectUnauthorized: false,
			//proxy:proxy,
			headers: {
				'watchsb': 'sbstream',
				'Accept': 'application/json, text/plain, */*',
				'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
				'Connection': 'keep-alive',
				'Cookie': 'ym_uid=1683472605724199959; _ym_d=1683472605; dom3ic8zudi28v8lr6fgphwffqoz0j6c=773b4a41-73ef-4e0c-a645-32d4242d6921%3A2%3A1; _gid=GA1.2.1199546987.1684090673; _ym_isad=2; _ym_visorc=b; _ga=GA1.2.460851833.1683727723; _gat_gtag_UA_166622646_1=1; _ga_LKBMYHCW0K=GS1.1.1684230563.19.1.1684230759.0.0.0',
				'Host': 'sblongvu.com',
				'Referer': url2,
				'Sec-Fetch-Dest': 'empty',
				'Sec-Fetch-Mode': 'cors',
				'Sec-Fetch-Site': 'same-origin',
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
				'sec-ch-ua': '"Google Chrome";v="113", "Chromium";v="113", "Not-A.Brand";v="24"',
				'sec-ch-ua-platform': '"Windows"',
			}
		};
		

		const req3 = https.request(options3, res3 => {
			let sblongvu = '';
					
			res3.on('data', d => {
				//process.stdout.write(d);
				sblongvu += d;
						 
			});
					
			res3.on('end', () => {
				try{		
					var sblongvujson = JSON.parse(sblongvu);
					var m3U8 = sblongvujson.stream_data.file;
					m3u8list.push(m3U8);			
				}catch(error){
					console.log(sblongvu);
					console.log(error);
				}
											
			});
					

		});
					  
		req3.on('error', error => {
			 console.error(error);
		});
		
		//req2.write(data2);
		req3.end(); 
					
}


function Finished(urls){
	var dataset = [];
				
		for (let i = 0; i < m3u8list.length; i++) {	
			var version = urls[i].version;
			
			if(version =="vf") version = "VF : version francaise";
			else if(version =="vf") version = "VOSTFR : version originale";
			
			var value = { name: 'Phantom', type: "movie", url:m3u8list[i],"title": urls[i].title+", "+urls[i].provider+" "+version+", HD",};
			dataset.push(value);						
		}
				
	return 	JSON.stringify(dataset);															
}	


//serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 })
module.exports = builder.getInterface()

/*var args = {};

args.id = "tt2911666";
args.type="movie";

defineStreamHandler(args);*/
