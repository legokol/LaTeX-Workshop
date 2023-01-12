import * as vscode from 'vscode'
import * as path from 'path'
import * as assert from 'assert'
import rimraf from 'rimraf'
import * as lw from '../../src/lw'
import * as test from './utils'
import { resetCachedLog } from '../../src/components/logger'
import { DocumentChanged } from '../../src/components/eventbus'

suite('Formatter test suite', () => {

    const suiteName = path.basename(__filename).replace('.test.js', '')
    let fixture = path.resolve(__dirname, '../../../test/fixtures/testground')
    const fixtureName = 'testground'

    suiteSetup(() => {
        fixture = path.resolve(lw.extensionRoot, 'test/fixtures/testground')
    })

    setup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        resetCachedLog()
    })

    teardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors')
        lw.manager.rootFile = undefined

        await vscode.workspace.getConfiguration('latex-workshop').update('latexindent.path', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('latexindent.args', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.tab', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.surround', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.case', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.trailingComma', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.sortby', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.handleDuplicates', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.sort.enabled', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.align-equal.enabled', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-entries.first', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-fields.sort.enabled', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-fields.order', undefined)

        if (path.basename(fixture) === 'testground') {
            rimraf(fixture + '/{*,.vscode/*}', (e) => {if (e) {console.error(e)}})
            await test.sleep(500) // Required for pooling
        }
    })

    test.run(suiteName, fixtureName, 'test latex formatter', async () => {
        await test.load(fixture, [{src: 'formatter/latex_base.tex', dst: 'main.tex'}])
        await test.open(fixture, 'main.tex')
        const original = vscode.window.activeTextEditor?.document.getText()
        const promise = test.wait(DocumentChanged)
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await promise
        const formatted = vscode.window.activeTextEditor?.document.getText()
        assert.notStrictEqual(original, formatted)
    })

    test.run(suiteName, fixtureName, 'change latexindent.path on the fly', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('latexindent.path', 'echo')
        await test.load(fixture, [{src: 'formatter/latex_base.tex', dst: 'main.tex'}])
        await test.open(fixture, 'main.tex')
        const original = vscode.window.activeTextEditor?.document.getText()
        // echo add a new \n to the end of stdin
        await vscode.workspace.getConfiguration('latex-workshop').update('latexindent.args', [original?.slice(0, -1)])
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await test.sleep(250) // wait for echo finish
        const echoed = vscode.window.activeTextEditor?.document.getText()
        assert.strictEqual(original, echoed)

        await vscode.workspace.getConfiguration('latex-workshop').update('latexindent.path', 'latexindent')
        await vscode.workspace.getConfiguration('latex-workshop').update('latexindent.args', ['-c', '%DIR%/', '%TMPFILE%', '-y=defaultIndent: \'%INDENT%\''])
        const promise = test.wait(DocumentChanged)
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await promise
        const formatted = vscode.window.activeTextEditor?.document.getText()
        assert.notStrictEqual(original, formatted)
    })

    test.run(suiteName, fixtureName, 'test bibtex formatter', async () => {
        await test.load(fixture, [{src: 'formatter/bibtex_base.bib', dst: 'main.bib'}])
        await test.open(fixture, 'main.bib')
        const original = vscode.window.activeTextEditor?.document.getText()
        const promise = test.wait(DocumentChanged)
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await promise
        const formatted = vscode.window.activeTextEditor?.document.getText()
        assert.notStrictEqual(original, formatted)
    })

    test.run(suiteName, fixtureName, 'test bibtex formatter with `bibtex-format.tab`', async () => {
        await test.load(fixture, [{src: 'formatter/bibtex_base.bib', dst: 'main.bib'}])
        await test.open(fixture, 'main.bib')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.tab', 'tab')
        let promise = test.wait(DocumentChanged)
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await promise
        let lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        assert.strictEqual(lines[1].slice(0, 1), '\t')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.tab', '2 spaces')
        promise = test.wait(DocumentChanged)
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await promise
        lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        assert.strictEqual(lines[1].slice(0, 2), '  ')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.tab', '4')
        promise = test.wait(DocumentChanged)
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await promise
        lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        assert.strictEqual(lines[1].slice(0, 4), '    ')
    })

    test.run(suiteName, fixtureName, 'test bibtex formatter with `bibtex-format.surround`', async () => {
        await test.load(fixture, [{src: 'formatter/bibtex_base.bib', dst: 'main.bib'}])
        await test.open(fixture, 'main.bib')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.surround', 'Curly braces')
        let promise = test.wait(DocumentChanged)
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await promise
        let lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        assert.strictEqual(lines[1].slice(-2, -1), '}')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.surround', 'Quotation marks')
        promise = test.wait(DocumentChanged)
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await promise
        lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        assert.strictEqual(lines[1].slice(-2, -1), '"')
    })

    test.run(suiteName, fixtureName, 'test bibtex formatter with `bibtex-format.case`', async () => {
        await test.load(fixture, [{src: 'formatter/bibtex_base.bib', dst: 'main.bib'}])
        await test.open(fixture, 'main.bib')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.case', 'UPPERCASE')
        let promise = test.wait(DocumentChanged)
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await promise
        let lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        assert.ok(lines[1].trim().slice(0, 1).match(/[A-Z]/))

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.case', 'lowercase')
        promise = test.wait(DocumentChanged)
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await promise
        lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        assert.ok(lines[1].trim().slice(0, 1).match(/[a-z]/))
    })

    test.run(suiteName, fixtureName, 'test bibtex formatter with `bibtex-format.trailingComma`', async () => {
        await test.load(fixture, [{src: 'formatter/bibtex_base.bib', dst: 'main.bib'}])
        await test.open(fixture, 'main.bib')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.trailingComma', true)
        let promise = test.wait(DocumentChanged)
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await promise
        let lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        assert.strictEqual(lines[5].trim().slice(-1), ',')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.trailingComma', false)
        promise = test.wait(DocumentChanged)
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await promise
        lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        assert.notStrictEqual(lines[5].trim().slice(-1), ',')
    })

    test.run(suiteName, fixtureName, 'test bibtex sorter with `bibtex-format.sortby`', async () => {
        await test.load(fixture, [{src: 'formatter/bibtex_base.bib', dst: 'main.bib'}])
        await test.open(fixture, 'main.bib')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.sortby', ['year'])
        let promise = test.wait(DocumentChanged)
        await vscode.commands.executeCommand('latex-workshop.bibsort')
        await promise
        let lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        let entries = lines.filter(line => line.includes('@'))
        assert.ok(entries[2].includes('art1'))
        assert.ok(entries[1].includes('lamport1994latex'))
        assert.ok(entries[0].includes('MR1241645'))

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.sortby', ['year-desc'])
        promise = test.wait(DocumentChanged)
        await vscode.commands.executeCommand('latex-workshop.bibsort')
        await promise
        lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        entries = lines.filter(line => line.includes('@'))
        assert.ok(entries[0].includes('art1'))
        assert.ok(entries[1].includes('lamport1994latex'))
        assert.ok(entries[2].includes('MR1241645'))
    })

    test.run(suiteName, fixtureName, 'test bibtex sorter with `bibtex-format.handleDuplicates`', async () => {
        await test.load(fixture, [{src: 'formatter/bibtex_dup.bib', dst: 'main.bib'}])
        await test.open(fixture, 'main.bib')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.handleDuplicates', 'Comment Duplicates')
        const promise = test.wait(DocumentChanged)
        await vscode.commands.executeCommand('latex-workshop.bibsort')
        await promise
        const lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        assert.strictEqual(lines.filter(line => line.includes('@')).length, 1)
    })

    test.run(suiteName, fixtureName, 'test bibtex formatter with `bibtex-format.sort.enabled`', async () => {
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.sortby', ['year'])
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.sort.enabled', true)
        await test.load(fixture, [{src: 'formatter/bibtex_base.bib', dst: 'main.bib'}])
        await test.open(fixture, 'main.bib')

        const promise = test.wait(DocumentChanged)
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await promise
        const lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        const entries = lines.filter(line => line.includes('@'))
        assert.ok(entries[2].includes('art1'))
        assert.ok(entries[1].includes('lamport1994latex'))
        assert.ok(entries[0].includes('MR1241645'))
    })

    test.run(suiteName, fixtureName, 'test bibtex formatter with `bibtex-format.align-equal.enabled`', async () => {
        await test.load(fixture, [{src: 'formatter/bibtex_base.bib', dst: 'main.bib'}])
        await test.open(fixture, 'main.bib')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.align-equal.enabled', false)
        let promise = test.wait(DocumentChanged)
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await promise
        let lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        const allEqual = (arr: number[]) => arr.every(val => val === arr[0])
        assert.ok(!allEqual(lines.filter(line => line.includes('=')).map(line => line.indexOf('='))))

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.align-equal.enabled', true)
        promise = test.wait(DocumentChanged)
        await vscode.commands.executeCommand('editor.action.formatDocument')
        await promise
        lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        assert.ok(allEqual(lines.filter(line => line.includes('=')).map(line => line.indexOf('='))))
    })

    test.run(suiteName, fixtureName, 'test bibtex sorter with `bibtex-entries.first`', async () => {
        await test.load(fixture, [{src: 'formatter/bibtex_base.bib', dst: 'main.bib'}])
        await test.open(fixture, 'main.bib')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-entries.first', ['book'])
        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-format.sortby', ['key'])
        const promise = test.wait(DocumentChanged)
        await vscode.commands.executeCommand('latex-workshop.bibsort')
        await promise
        const lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        const entries = lines.filter(line => line.includes('@'))
        assert.ok(entries[2].includes('art1'))
        assert.ok(entries[0].includes('lamport1994latex'))
        assert.ok(entries[1].includes('MR1241645'))
    })

    test.run(suiteName, fixtureName, 'test bibtex aligner with `bibtex-fields.sort.enabled` and `bibtex-fields.order`', async () => {
        await test.load(fixture, [{src: 'formatter/bibtex_base.bib', dst: 'main.bib'}])
        await test.open(fixture, 'main.bib')

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-fields.sort.enabled', true)
        let promise = test.wait(DocumentChanged)
        await vscode.commands.executeCommand('latex-workshop.bibalign')
        await promise
        let lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        let entries = lines.filter(line => line.includes('='))
        assert.ok(entries[0].includes('author'))
        assert.ok(entries[1].includes('description'))
        assert.ok(entries[2].includes('journal'))
        assert.ok(entries[3].includes('title'))
        assert.ok(entries[4].includes('year'))

        await vscode.workspace.getConfiguration('latex-workshop').update('bibtex-fields.order', ['title', 'author', 'year'])
        promise = test.wait(DocumentChanged)
        await vscode.commands.executeCommand('latex-workshop.bibalign')
        await promise
        lines = vscode.window.activeTextEditor?.document.getText().split('\n')
        assert.ok(lines)
        entries = lines.filter(line => line.includes('='))
        assert.ok(entries[0].includes('title'))
        assert.ok(entries[1].includes('author'))
        assert.ok(entries[2].includes('year'))
        assert.ok(entries[3].includes('description'))
        assert.ok(entries[4].includes('journal'))
    })
})