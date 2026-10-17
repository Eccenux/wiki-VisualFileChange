# VisualFileChange

VisualFileChange is a Wikimedia Commons gadget that helps users perform bulk changes to files uploaded by a particular user or files within a category. VFC is based on *AjaxMassDelete* that is focused on removal requests.

For usage instructions, see [Help:VisualFileChange.js](https://commons.wikimedia.org/wiki/Help:VisualFileChange.js).

## History

VisualFileChange was originally developed by [User:Rillke](https://commons.wikimedia.org/wiki/User:Rillke) in 2011 
and later more authors contributed the code including: Zhuyifei1999, Perhelion, Krinkle, AntiCompositeNumber, Lucas Werkmeister, Steinsplitter, Krenair, ~riley, Ruthven, Saibo, Ebrahim, Nux and others.

More specific contribution stats:

- [core.js user stats](https://xtools.wmcloud.org/articleinfo/commons.wikimedia.org/MediaWiki:Gadget-VisualFileChange.js/core.js?editorlimit=200)
- [cfg.js user stats](https://xtools.wmcloud.org/articleinfo/commons.wikimedia.org/MediaWiki:Gadget-VisualFileChange.js/cfg.js?editorlimit=200)
- [exec.js user stats](https://xtools.wmcloud.org/articleinfo/commons.wikimedia.org/MediaWiki:Gadget-VisualFileChange.js/exec.js?editorlimit=200)
- [ui.js user stats](https://xtools.wmcloud.org/articleinfo/commons.wikimedia.org/MediaWiki:Gadget-VisualFileChange.js/ui.js?editorlimit=200)

## Dependencies

The gadget consists of the following modules:

- `VisualFileChange.js` – just a main loader
- `VisualFileChange.js/core.js` – core functionality, file management, and shared utilities
- `VisualFileChange.js/exec.js` – execution of batch operations on selected files
- `VisualFileChange.js/ui.js` – user interface, file selection, and interaction handling
- `VisualFileChange.js/cfg.js` – configuration interface, settings, and user profiles
- `VisualFileChange.css` – styles for the user interface, including dark mode support

Also includes:
- `VisualFileChange.js/install.js` – deprecated installation helper
- [VisualFileChange.js/i18n/ar.js](https://commons.wikimedia.org/wiki/MediaWiki:Gadget-VisualFileChange.js/i18n/ar.js) – Arabic
- [VisualFileChange.js/i18n/de.js](https://commons.wikimedia.org/wiki/MediaWiki:Gadget-VisualFileChange.js/i18n/de.js) – Deutsch
- [VisualFileChange.js/i18n/it.js](https://commons.wikimedia.org/wiki/MediaWiki:Gadget-VisualFileChange.js/i18n/it.js) – Italian
- [VisualFileChange.js/i18n/sl.js](https://commons.wikimedia.org/wiki/MediaWiki:Gadget-VisualFileChange.js/i18n/sl.js) – Slovene

## License

Licensed under **CC BY-SA** and **GFDL**.

**Attribution:** [User:Rillke](https://commons.wikimedia.org/wiki/User:Rillke) and others.

Contributors proposing or making changes agree to publish their contributions under the same licenses.

When reusing the script, attribution must be included in the user interface.
