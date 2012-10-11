[![build status](https://secure.travis-ci.org/trevorparscal/cssjanus.png)](http://travis-ci.org/trevorparscal/cssjanus)
# CSSJanus

Converts CSS stylesheets between left-to-right and right-to-left. This is a JavaScript port for Node.js of [CSSJanus](http://code.google.com/p/cssjanus/), which is written in python.

## Install
    npm install cssjanus

## Basic usage
```javascript
var cssjanus = require( 'cssjanus' );
var rtlCss = cssjanus.transform( ltrCss );
```

## Advanced usage

``transform( css, swapLtrRtlInUrl, swapLeftRightInUrl )``

* ``css`` (String) Stylesheet to transform
* ``swapLtrRtlInUrl`` (Boolean) Swap 'ltr' and 'rtl' in URLs
* ``swapLeftRightInUrl`` (Boolean) Swap 'left' and 'right' in URLs

### Preventing flipping
Use a ```/* @noflip */``` comment to protect a rule from being changed.

    .rule1 {
      /* Will be converted to margin-right */
      margin-left: 1em;
    }
    /* @noflip */
    .rule2 {
      /* Will be preserved as margin-left */
      margin-left: 1em;
    }

### Additional Resources
* [Interactive demo](http://cssjanus.commoner.com/)
* [Demo video](http://google-opensource.blogspot.com/2008/03/cssjanus-helping-i18n-and-ltr-to-rtl.html)
