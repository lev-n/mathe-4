# Third-party notices

Mathe 4 itself is licensed under the GNU Affero General Public License v3.0 or later (`AGPL-3.0-or-later`, see [`LICENSE`](LICENSE)). It uses the third-party components listed below. Each keeps its own license; none of them is relicensed under the AGPL.

This list is generated from `package-lock.json` (141 packages) and the license files shipped in the npm packages.

## License compatibility

| Component | License | Used how | Compatible with AGPL-3.0-or-later? |
|---|---|---|---|
| React, React DOM, Scheduler | MIT | Bundled into the website | Yes. MIT is a permissive, GPL-compatible license. The MIT copyright notice must be kept (see below). |
| Atkinson Hyperlegible Next, Atkinson Hyperlegible Mono, Andika (via Fontsource) | SIL OFL 1.1 | Font files bundled with the website, unmodified | Yes. OFL § 2 explicitly allows bundling the fonts with any software. The fonts stay under the OFL as a separate work (aggregation, not a derivative of the code). They may not be sold on their own, and modified versions must not use the original font names. |
| Build and test tools (Vite, Vitest, TypeScript, jsdom, …) | MIT, ISC, BSD-2/3-Clause, Apache-2.0, MPL-2.0, BlueOak-1.0.0, MIT-0, CC0-1.0 | Development only; not part of the published website | Yes. They are not distributed with the app. All of them are permissive (MIT, ISC, BSD, Apache-2.0, BlueOak, MIT-0), a public-domain dedication (CC0) or file-level weak copyleft (MPL-2.0, which explicitly allows combination with GPL-family licenses, § 3.3). None of them places requirements on the Mathe 4 code. |

No dependency uses a license that is incompatible with AGPL-3.0-or-later. No dependency is under a non-free license or lacks license information.

## Bundled into the website

These packages end up in the built site (`dist/`).

| Package | Version | License | Copyright |
|---|---|---|---|
| [react](https://github.com/facebook/react) | 19.3.1 | MIT | Copyright (c) Meta Platforms, Inc. and affiliates. |
| [react-dom](https://github.com/facebook/react) | 19.3.1 | MIT | Copyright (c) Meta Platforms, Inc. and affiliates. |
| [scheduler](https://github.com/facebook/react) (dependency of react-dom) | 0.28.0 | MIT | Copyright (c) Meta Platforms, Inc. and affiliates. |
| [@fontsource-variable/atkinson-hyperlegible-next](https://fontsource.org/fonts/atkinson-hyperlegible-next) | 5.3.0 | OFL-1.1 | Copyright 2020-2024 The Atkinson Hyperlegible Next Project Authors (https://github.com/googlefonts/atkinson-hyperlegible-next) |
| [@fontsource-variable/atkinson-hyperlegible-mono](https://fontsource.org/fonts/atkinson-hyperlegible-mono) | 5.3.0 | OFL-1.1 | Copyright 2020-2024 The Atkinson Hyperlegible Mono Project Authors (https://github.com/googlefonts/atkinson-hyperlegible-next-mono) |
| [@fontsource/andika](https://fontsource.org/fonts/andika) | 5.3.0 | OFL-1.1 | Copyright (c) 2004-2022 SIL International |

The font files are used unmodified. `src/styles/fonts.css` only selects which characters a font is used for (`unicode-range`) and scales it (`size-adjust`); this does not change the font files.

## Development only (not distributed)

135 packages, needed only to build and test the app. Licenses: MIT (88), Apache-2.0 (25), MPL-2.0 (12), MIT-0 (2), BSD-2-Clause (2), ISC (2), BSD-3-Clause (2), BlueOak-1.0.0 (1), CC0-1.0 (1). Platform-specific native binaries (one per operating system and CPU; npm installs only the matching one) are grouped as `name-*`.

| Package | Version | License |
|---|---|---|
| @asamuzakjp/css-color | 7.1.7 | MIT |
| @asamuzakjp/dom-selector | 10.0.4 | MIT |
| @babel/code-frame | 7.29.7 | MIT |
| @babel/helper-validator-identifier | 7.29.7 | MIT |
| @babel/runtime | 7.29.10 | MIT |
| @bramus/specificity | 2.4.3 | MIT |
| @csstools/color-helpers | 6.1.2 | MIT-0 |
| @csstools/css-calc | 3.4.3 | MIT |
| @csstools/css-color-parser | 4.2.6 | MIT |
| @csstools/css-parser-algorithms | 4.0.2 | MIT |
| @csstools/css-syntax-patches-for-csstree | 1.1.15 | MIT-0 |
| @csstools/css-tokenizer | 4.0.2 | MIT |
| @exodus/bytes | 1.16.0 | MIT |
| @jridgewell/resolve-uri | 3.1.2 | MIT |
| @jridgewell/sourcemap-codec | 1.6.0 | MIT |
| @jridgewell/trace-mapping | 0.3.31 | MIT |
| @oxc-project/types | 0.154.0 | MIT |
| @rolldown/binding-* (15 platform builds) | 1.2.14 | MIT |
| @rolldown/pluginutils | 1.0.1 | MIT |
| @testing-library/dom | 10.4.2 | MIT |
| @testing-library/react | 16.3.3 | MIT |
| @types/aria-query | 5.0.4 | MIT |
| @types/chai | 5.2.3 | MIT |
| @types/deep-eql | 4.0.2 | MIT |
| @types/estree | 1.0.9 | MIT |
| @types/react | 19.3.0 | MIT |
| @types/react-dom | 19.3.0 | MIT |
| @typescript/typescript-* (20 platform builds) | 7.0.2 | Apache-2.0 |
| @vitejs/plugin-react | 6.1.2 | MIT |
| @vitest/mocker | 5.0.5 | MIT |
| @vitest/spy | 5.0.5 | MIT |
| ansi-regex | 5.0.1 | MIT |
| ansi-styles | 5.2.0 | MIT |
| aria-query | 5.3.0 | Apache-2.0 |
| assertion-error | 2.0.1 | MIT |
| bidi-js | 1.1.0 | MIT |
| chai | 6.3.0 | MIT |
| css-tree | 3.2.1 | MIT |
| csstype | 3.2.3 | MIT |
| data-urls | 8.0.0 | MIT |
| decimal.js | 10.6.0 | MIT |
| dequal | 2.0.3 | MIT |
| detect-libc | 2.1.2 | Apache-2.0 |
| dom-accessibility-api | 0.5.16 | MIT |
| entities | 8.1.0 | BSD-2-Clause |
| es-module-lexer | 2.3.2 | MIT |
| estree-walker | 3.0.3 | MIT |
| expect-type | 1.4.0 | Apache-2.0 |
| fdir | 6.5.0 | MIT |
| fsevents (platform-specific) | 2.3.3 | MIT |
| html-encoding-sniffer | 7.0.0 | MIT |
| is-potential-custom-element-name | 1.0.1 | MIT |
| js-tokens | 4.0.0 | MIT |
| jsdom | 30.1.3 | MIT |
| lightningcss | 1.33.0 | MPL-2.0 |
| lightningcss-* (11 platform builds) | 1.33.0 | MPL-2.0 |
| lru-cache | 11.5.3 | BlueOak-1.0.0 |
| lz-string | 1.5.0 | MIT |
| magic-string | 1.4.3 | MIT |
| mdn-data | 2.27.1 | CC0-1.0 |
| nanoid | 3.3.20 | MIT |
| obug | 3.0.0 | MIT |
| parse5 | 8.0.1 | MIT |
| picocolors | 1.1.1 | ISC |
| picomatch | 4.0.7 | MIT |
| postcss | 8.5.30 | MIT |
| pretty-format | 27.5.1 | MIT |
| punycode | 2.3.1 | MIT |
| react-is | 17.0.2 | MIT |
| require-from-string | 2.0.2 | MIT |
| rolldown | 1.2.14 | MIT |
| saxes | 6.0.0 | ISC |
| source-map-js | 1.2.2 | BSD-3-Clause |
| std-env | 4.3.0 | MIT |
| tinybench | 6.2.2 | MIT |
| tinyexec | 1.3.1 | MIT |
| tinyglobby | 0.2.17 | MIT |
| tldts | 7.4.18 | MIT |
| tldts-core | 7.4.18 | MIT |
| tough-cookie | 6.0.2 | BSD-3-Clause |
| tr46 | 7.0.0 | MIT |
| typescript | 7.0.2 | Apache-2.0 |
| undici | 8.12.2 | MIT |
| vite | 8.3.4 | MIT |
| vitest | 5.0.5 | MIT |
| w3c-xmlserializer | 6.0.0 | MIT |
| webidl-conversions | 8.0.1 | BSD-2-Clause |
| whatwg-mimetype | 5.0.0 | MIT |
| whatwg-url | 17.3.0 | MIT |
| why-is-node-running | 3.2.1 | MIT |
| xml-name-validator | 5.0.0 | Apache-2.0 |
| xmlchars | 2.2.0 | MIT |

## License texts

### MIT License (React, React DOM, Scheduler)

```
MIT License

Copyright (c) Meta Platforms, Inc. and affiliates.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### SIL Open Font License 1.1 (Atkinson Hyperlegible Next, Atkinson Hyperlegible Mono, Andika)

Copyright notices:

- Copyright 2020-2024 The Atkinson Hyperlegible Next Project Authors (https://github.com/googlefonts/atkinson-hyperlegible-next)
- Copyright 2020-2024 The Atkinson Hyperlegible Mono Project Authors (https://github.com/googlefonts/atkinson-hyperlegible-next-mono)
- Copyright (c) 2004-2022 SIL International

This Font Software is licensed under the SIL Open Font License, Version 1.1. This license is copied below, and is also available with a FAQ at: https://openfontlicense.org

```
-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
```
