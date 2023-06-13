// Function to preview links
function previewLinks() {
  $(document).ready(function() {
    // Get all the links within the content class (posts) and chat, excluding mentions plugin links
    var links = $(".content a:not(.plugin-mentions-a), [component=\"chat/message/body\"] a");

    // List of domains to ignore
    var ignoredDomains = [window.location.protocol + "//" + window.location.hostname];

    // List of paths to ignore
    var ignoredPaths = ['/post'];

    // Log the ignored domains and paths
    console.log("OGProxy: Domains containing (or starting with) " + ignoredDomains[0] + " are in the ignore list and will not be parsed.");
    console.log("OGProxy: Paths containing " + ignoredPaths[0] + " are in the ignore list and will not be parsed.");
    console.log("OGProxy: Parsing DOM for any URLs that should be converted to previews.");

    // Iterate over each link
    links.each(function() {
      var link = $(this);
      var url = link.attr("href");
      var hostname = link.prop("hostname");

      // Helper function to check if the URL is a file URL
      function isFileUrl(url) {
        var fileExtensionPattern = /\.(png|jpeg|gif|pdf|docx?|xlsx?|pptx?|zip|rar|svg)$/i;
        return fileExtensionPattern.test(url);
      }
      
      function isFullPath(url) {
      // Regular expression to match a full path URL
        var fullPathRegex = /^(?:[a-z]+:)?\/\//i;
  
      // Check if the URL matches the full path pattern
        return fullPathRegex.test(url);
      }

      // Helper function to check if the domain should be ignored
      function shouldIgnoreDomain(url, ignoredDomains) {
        var domain = extractDomain(url);
        if (ignoredPaths.some(path => url.includes(path))) {
          return true;
        }
        return domain && ignoredDomains.includes(domain);
      }

      // Helper function to extract the domain from the URL
      function extractDomain(url) {
        var domain = url.split('/')[2]?.split(':')[0];
        return domain;
      }

      // Process the link if it's not a file URL and not in the ignored domain list
      if (!isFileUrl(url) && !shouldIgnoreDomain(url, ignoredDomains)) {
        var host = window.location.protocol + "//" + hostname;
        var faviconApi = "https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=" + host + "&size=32";
        console.log("OGProxy: Getting favicon for URL: " + url);
        var website = link.prop("hostname");
        var altSite = website.replace(/^www\./, "").replace(/\..+$/, "");
        var proxy = "FQDN_TO_YOUR_SITE_HERE";
        var apiKey = "YOUR_API_KEY";

        // Send an AJAX request to the proxy server to fetch OpenGraph data for the URL
        $.ajax({
          url: proxy + "/ogproxy?url=" + url,
          method: "GET",
          headers: {
            'X-Api-Key': apiKey
          },
          success: function(data) {
            var result = data.result;
            // Extract relevant data from the OpenGraph result or use fallback values
            var altTitle = $(result).filter('meta[property="og:title"]').attr('content');
            var altDescription = $(result).filter('meta[property="og:description"]').attr('content');
            var tempDescription = "This website did not return any description. It might be behind a login or paywall.";
            var altImageUrl = $(result).filter('meta[property="og:image"]').attr('content');
            var tempImage = proxy + "/images/404.webp";
            var url = result.requestUrl || url;
            var title = result.ogTitle || altTitle;
            var description = result.ogDescription || altDescription || tempDescription;
            var favicon = faviconApi || result.favicon || data.faviconUrl;
            var imageUrl = result.ogImage && result.ogImage[0].url || altImageUrl || tempImage;
            // Some websites return a relative path for the image URL, which isn't much use, so we need to change this to full
            var fullImagePath = host + imageUrl;
            var site = result.ogSiteName || altSite;
            if(isFullPath(imageUrl) === false) {
                imageUrl = fullImagePath;
            }
            console.log("OGProxy: Getting data from " + url);
            // Create the HTML for the link preview card
            var cardHtml = '<a href="' + url + '">' +
              '<div class="card card-preview">' +
              '<div id="card-image"><img src="' + imageUrl + '"></div>' +
              '<div class="card-body">' +
              '<h4 id="sitetitle" class="card-site-title"><img id="favicon" class="card-favicon" src="' + favicon + '">' + site + '</h4>' +
              '<h6 class="card-title">' + title + '</h6>' +
              '<p class="card-text">' + description + '</p>' +
              '</div>' +
              '</div>' +
              '</a>';
            // Replace the original link with the link preview card
            link.replaceWith(cardHtml);
          },
          error: function() {
            console.log("OGProxy: Error fetching OpenGraph data for URL: " + url);
          }
        });
      }
    });
  });
}
