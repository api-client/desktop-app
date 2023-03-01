/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as monaco from 'monaco-editor';

// @ts-ignore
globalThis.MonacoEnvironment = {
	getWorker: (_moduleId: string, label: string): Worker => {
		let url: string;
		switch (label) {
			case 'json': 
				url = `/dist/monaco/json.worker.js?worker`; 
				break;
			case 'css':
			case 'scss':
			case 'less':
				url = `/dist/monaco/css.worker.js`;
				break;
			case 'html':
			case 'handlebars':
			case 'razor':
				url = `/dist/monaco/html.worker.js`;
				break;
			case 'javascript':
			case 'typescript':
				url = `/dist/monaco/ts.worker.js`;
				break;
			default: 
				url = `/dist/monaco/editor.worker.js`; 
				break;
		}

		return new Worker(url, {
			type: 'module',
			name: label,
		});
	}
};

// @ts-ignore
globalThis.monaco = monaco;
