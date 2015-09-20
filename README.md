# unofficial HipChat client

[![Chrome Webstore][2]][1]
[<img width="64px" height="64px" src="https://raw.githubusercontent.com/catdad/unofficial-hipchat/master/assets/128.png" />][1]

###Disclaimer

This app is not associated with the real HipChat client or Atlassian in any way.

###Background

My company recently began using HipChat. However, the native desktop client for Windows is completely abismal. On a regular display, the app is ugly and off-putting at best. On a high dpi display -- which are ever more common, and the only laptops available at my company -- the desktop app is downright unusable. Many of the buttons are too small to click, icons are tiny, and the text is either very camped, impossibly tiny, or entirely clipped in some menus.

As a developer, I cannot stand for this, and refuse to use such a bad application. Luckily, the web client is pretty decent. It just needs a little help. In this app, I am using the web client and wrapping it in a Chrome Packaged App, adding in some notification goodness.

![screenshot][4]

###Building

After installing Node, building is as easy as:

    npm install
    gulp
    
###Installation

Download from the [Chrome Webstore][1].

You can download this repo and build it. Then, deploy the `build` folder as an unpackaged app in Chrome ([see step 2 here](https://support.google.com/chrome/a/answer/2714278)).

###Contributions

Yes, please. Submit issues, PRs, etc.

###Note to Atlassian

If you find this source code, it's yours. I only made this because I need a better client before I would consider using the HipChat service.

[![Analytics](https://ga-beacon.appspot.com/UA-17159207-7/unofficial-hipchat/readme?flat)](https://github.com/igrigorik/ga-beacon)

[1]: https://chrome.google.com/webstore/detail/lgdomahdfnkdhjfkennlfhagbjamalkb
[2]: https://developer.chrome.com/webstore/images/ChromeWebStore_Badge_v2_206x58.png
[3]: https://raw.githubusercontent.com/catdad/unofficial-hipchat/master/assets/128.png
[4]: https://raw.githubusercontent.com/catdad/unofficial-hipchat/master/art/1280x800.png