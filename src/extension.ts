import * as vscode from 'vscode';
import { SiteTreeDataProvider } from './treeDataProvider';
import * as path from 'path';
import * as fs from 'fs';

// Глобальная переменная для провайдера дерева
let siteTreeDataProvider: SiteTreeDataProvider;

export function activate(context: vscode.ExtensionContext) {
    // Инициализируем провайдер дерева, используя корневой путь рабочего пространства
    siteTreeDataProvider = new SiteTreeDataProvider(vscode.workspace.rootPath || '');
    
    // Создаём представление дерева в боковой панели (Activity Bar/Explorer)
    vscode.window.createTreeView('siteStructure', {
        treeDataProvider: siteTreeDataProvider
    });
    
    // Команда: Сканировать проект
    let scanCommand = vscode.commands.registerCommand('extension.scanProject', () => {
        siteTreeDataProvider.refresh();
        vscode.window.showInformationMessage('Сканирование проекта выполнено');
    });
    
    // Команда: Экспорт карты
    let exportCommand = vscode.commands.registerCommand('extension.exportTree', async () => {
        const options = ['PDF', 'XML', 'Excel'];
        const choice = await vscode.window.showQuickPick(options, { placeHolder: 'Выберите формат экспорта' });
        if (!choice) {
            return;
        }
        exportTree(choice);
    });
    
    // Команда: Подключиться к удалённому проекту (имитация)
    let remoteCommand = vscode.commands.registerCommand('extension.connectRemote', async () => {
        const remoteType = await vscode.window.showQuickPick(['FTP', 'SSH', 'Git'], { placeHolder: 'Выберите тип подключения' });
        if (!remoteType) {
            return;
        }
        const host = await vscode.window.showInputBox({ prompt: 'Введите адрес хоста' });
        const username = await vscode.window.showInputBox({ prompt: 'Введите имя пользователя' });
        const password = await vscode.window.showInputBox({ prompt: 'Введите пароль', password: true });
        // Здесь должна быть реализована логика подключения к удалённому источнику.
        vscode.window.showInformationMessage(`Подключение ${remoteType} к ${host} установлено (симуляция)`);
    });
    
    context.subscriptions.push(scanCommand, exportCommand, remoteCommand);
    
    // Создаём FileSystemWatcher для отслеживания изменений в HTML, CSS и JS файлах
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.{html,css,js}');
    watcher.onDidChange(uri => onFileChange(uri));
    watcher.onDidCreate(uri => onFileChange(uri));
    watcher.onDidDelete(uri => onFileChange(uri));
    context.subscriptions.push(watcher);
    
    vscode.window.showInformationMessage('Site Structure Mapper активирован');
}

function onFileChange(uri: vscode.Uri) {
    // Обновляем дерево при изменениях в файлах
    siteTreeDataProvider.refresh();
    vscode.window.showInformationMessage(`Изменения в файле: ${uri.fsPath}`);
}

function exportTree(format: string) {
    const treeData = siteTreeDataProvider.getTreeData();
    const workspaceFolder = vscode.workspace.rootPath || '';
    const exportDir = path.join(workspaceFolder, 'site-structure-export');
    
    if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir);
    }
    
    switch(format) {
        case 'PDF':
            exportToPDF(treeData, path.join(exportDir, 'site_structure.pdf'));
            break;
        case 'XML':
            exportToXML(treeData, path.join(exportDir, 'site_structure.xml'));
            break;
        case 'Excel':
            exportToExcel(treeData, path.join(exportDir, 'site_structure.xlsx'));
            break;
        default:
            vscode.window.showErrorMessage('Неверный формат экспорта');
    }
}

function exportToPDF(treeData: any, filePath: string) {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filePath));
    doc.fontSize(14).text('Структура сайта', { underline: true });
    doc.moveDown();
    // Рекурсивная функция для вывода узлов дерева
    function printNode(node: any, indent: number) {
        doc.text(' '.repeat(indent * 4) + node.label);
        if (node.children) {
            node.children.forEach((child: any) => {
                printNode(child, indent + 1);
            });
        }
    }
    treeData.forEach((node: any) => printNode(node, 0));
    doc.end();
    vscode.window.showInformationMessage(`Экспорт в PDF выполнен: ${filePath}`);
}

function exportToXML(treeData: any, filePath: string) {
    const { create } = require('xmlbuilder2');
    function buildXML(nodes: any) {
        return nodes.map((node: any) => {
            let obj: any = { '@label': node.label };
            if (node.children && node.children.length > 0) {
                obj.node = buildXML(node.children);
            }
            return obj;
        });
    }
    const root = { siteStructure: { node: buildXML(treeData) } };
    const xml = create({ version: '1.0' }, root).end({ prettyPrint: true });
    fs.writeFileSync(filePath, xml);
    vscode.window.showInformationMessage(`Экспорт в XML выполнен: ${filePath}`);
}

function exportToExcel(treeData: any, filePath: string) {
    const ExcelJS = require('exceljs');
    let workbook = new ExcelJS.Workbook();
    let worksheet = workbook.addWorksheet('Структура сайта');
    worksheet.columns = [
        { header: 'Уровень', key: 'level', width: 10 },
        { header: 'Название', key: 'label', width: 30 }
    ];
    
    function addRows(nodes: any, level: number) {
        nodes.forEach((node: any) => {
            worksheet.addRow({ level: level, label: node.label });
            if (node.children) {
                addRows(node.children, level + 1);
            }
        });
    }
    
    addRows(treeData, 0);
    
    workbook.xlsx.writeFile(filePath).then(() => {
        vscode.window.showInformationMessage(`Экспорт в Excel выполнен: ${filePath}`);
    });
}

export function deactivate() {}
