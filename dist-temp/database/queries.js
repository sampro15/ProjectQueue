"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertToDatabase = insertToDatabase;
exports.getQueueQuery = getQueueQuery;
exports.getGlobalVars = getGlobalVars;
exports.setGlobalVars = setGlobalVars;
exports.getTaskByGuid = getTaskByGuid;
exports.updateTaskStatus = updateTaskStatus;
exports.checkQueueIsEmpty = checkQueueIsEmpty;
exports.getNextPendingProject = getNextPendingProject;
exports.updateProjectStatus = updateProjectStatus;
exports.addProject = addProject;
exports.removeProject = removeProject;
exports.removeAllProjectsQuery = removeAllProjectsQuery;
exports.switchProjects = switchProjects;
exports.insertTaskLog = insertTaskLog;
exports.getLatestLogs = getLatestLogs;
exports.updateTaskTimes = updateTaskTimes;
exports.updateTaskNextGuid = updateTaskNextGuid;
exports.getTaskById = getTaskById;
exports.getProjectById = getProjectById;
exports.recoverInterruptedProject = recoverInterruptedProject;
exports.rerunProjectByTaskId = rerunProjectByTaskId;
exports.updateNextTaskByName = updateNextTaskByName;
exports.addTasksToProject = addTasksToProject;
exports.getEventReason = getEventReason;
exports.abortAllProjects = abortAllProjects;
const db_1 = require("./db");
const uuid_1 = require("uuid");
async function insertToDatabase(queue) {
    let conn;
    try {
        conn = await (0, db_1.getConnection)();
        await conn.exec("BEGIN IMMEDIATE;");
        // Get the last order_index from the database
        const lastOrderRow = await conn.get("SELECT COALESCE(MAX(order_index), -1) as last_order FROM projects");
        let nextOrderIndex = lastOrderRow.last_order + 1;
        // Insert all projects first
        const projectStmt = await conn.prepare("INSERT INTO projects (project_key, manager, global_vars, order_index, status) VALUES (?, ?, ?, ?, ?)");
        for (const project of queue.projects) {
            const result = await projectStmt.run(project.project_key, project.manager, JSON.stringify(project.global_vars), nextOrderIndex++, project.status || "pending");
            if (result.lastID) {
                project.id = result.lastID;
            }
        }
        await projectStmt.finalize();
        // Insert all tasks
        const taskStmt = await conn.prepare("INSERT INTO tasks (project_id, guid, type, name, comment, action, task_params, next_task_guid, is_active, status) VALUES (?, ?, ?, ?, ?, ?, json(?), ?, ?, ?)");
        for (const project of queue.projects) {
            for (const task of project.tasks) {
                task.project_id = project.id;
                const result = await taskStmt.run(project.id, task.guid, task.type, task.name, task.comment, task.action, JSON.stringify(task.task_params), task.next_task_guid, task.is_active, task.status || "pending");
                if (result.lastID) {
                    task.id = result.lastID;
                }
            }
        }
        await taskStmt.finalize();
        await conn.exec("COMMIT;");
    }
    catch (err) {
        console.error("Error running insertToDatabase", err);
        await conn?.exec("ROLLBACK;");
        throw err;
    }
    finally {
        if (conn) {
            (0, db_1.closeDatabase)(conn);
        }
    }
}
async function getQueueQuery(limit, offset, since, conn) {
    let needToClose = false;
    try {
        if (!conn) {
            conn = await (0, db_1.getConnection)();
            needToClose = true;
        }
        // Build the WHERE clause for the since filter
        const whereClause = since ? "WHERE p.created_at >= ?" : "";
        const params = since
            ? [since.toISOString().slice(0, 19).replace("T", " ")]
            : [];
        // First get total count for pagination with the since filter
        const totalResult = await conn.get(`SELECT COUNT(*) as count FROM projects p ${whereClause}`, ...params);
        const total = totalResult.count;
        // Add pagination parameters to params array
        params.push(limit || 10, offset || 0);
        // Get projects with pagination and since filter
        const rows = await conn.all(`
            SELECT 
                p.id as project_id,
                p.project_key,
                p.manager,
                p.global_vars,
                p.is_active as project_is_active,
                p.created_at as project_created_at,
                p.status as project_status,
                p.order_index as project_order_index,
                t.id as task_id,
                t.guid,
                t.comment,
                t.name,
                t.action,
                t.task_params,
                t.type as task_type,
                t.created_at as task_created_at,
                t.next_task_guid,
                t.is_active as task_is_active,
                t.started_at as task_started_at,
                t.completed_at as task_completed_at,
                t.status as task_status
            FROM projects p
            LEFT JOIN tasks t ON p.id = t.project_id
            ${whereClause}
            ORDER BY p.order_index DESC, p.id, t.id
            LIMIT ? OFFSET ?
        `, ...params);
        const queue = {
            projects: [],
            pagination: {
                limit: limit || 100,
                offset: offset || 0,
                total: total,
            },
        };
        if (!rows.length) {
            //return undefined;
            return queue;
        }
        let currentProject = null;
        for (const row of rows) {
            // Start new project if we haven't seen this project_id
            if (!currentProject || currentProject.id !== row.project_id) {
                const global_vars = row.global_vars ? JSON.parse(row.global_vars) : {};
                currentProject = {
                    id: row.project_id,
                    project_key: row.project_key,
                    manager: row.manager,
                    global_vars: global_vars,
                    tasks: [],
                    is_active: Boolean(row.project_is_active),
                    created_at: row.project_created_at,
                    status: row.project_status,
                    order_index: row.project_order_index,
                };
                queue.projects.push(currentProject);
            }
            if (row.task_id) {
                currentProject.tasks.push({
                    id: row.task_id,
                    project_id: row.project_id,
                    guid: row.guid,
                    name: row.name,
                    comment: row.comment,
                    action: row.action,
                    task_params: JSON.parse(row.task_params),
                    next_task_guid: row.next_task_guid,
                    is_active: Boolean(row.task_is_active),
                    status: row.task_status,
                    type: row.task_type,
                    created_at: row.task_created_at,
                    started_at: row.task_started_at,
                    completed_at: row.task_completed_at,
                });
            }
        }
        return queue;
    }
    catch (err) {
        console.error("Error running getQueueQuery", err);
        throw err;
    }
    finally {
        if (needToClose && conn) {
            (0, db_1.closeDatabase)(conn);
        }
    }
}
async function getGlobalVars(projectId) {
    let conn;
    try {
        conn = await (0, db_1.getConnection)();
        if (projectId) {
            const rows = await conn.all(`SELECT global_vars FROM projects WHERE id = ?`, projectId);
            return rows[0]?.global_vars;
        }
        else {
            // Get global vars from the currently running project
            const rows = await conn.all(`
                SELECT global_vars 
                FROM projects 
                WHERE status = 'running' 
                ORDER BY order_index ASC 
                LIMIT 1
            `);
            return rows[0]?.global_vars;
        }
    }
    catch (err) {
        console.error("Error running getGlobalVars", err);
        throw err;
    }
    finally {
        if (conn) {
            (0, db_1.closeDatabase)(conn);
        }
    }
}
async function setGlobalVars(projectId, globalVars) {
    let conn;
    try {
        conn = await (0, db_1.getConnection)();
        const stmt = await conn.prepare(`UPDATE projects SET global_vars = json(?) WHERE id = ?`, JSON.stringify(globalVars), projectId);
        await stmt.run();
        await stmt.finalize();
    }
    catch (err) {
        console.error("Error running setGlobalVars", err);
        throw err;
    }
    finally {
        if (conn) {
            (0, db_1.closeDatabase)(conn);
        }
    }
}
async function getTaskByGuid(guid) {
    const conn = await (0, db_1.getConnection)();
    try {
        const task = await conn.get("SELECT * FROM tasks WHERE guid = ?", guid);
        if (task) {
            return {
                ...task,
                task_params: JSON.parse(task.task_params),
                is_active: Boolean(task.is_active),
            };
        }
        return undefined;
    }
    catch (err) {
        console.error("Error running getTaskByGuid", err);
        throw err;
    }
    finally {
        if (conn) {
            (0, db_1.closeDatabase)(conn);
        }
    }
}
async function updateTaskStatus(taskId, status) {
    let conn;
    try {
        conn = await (0, db_1.getConnection)();
        const stmt = await conn.prepare("UPDATE tasks SET status = ? WHERE id = ?");
        await stmt.run(status, taskId);
        await stmt.finalize();
    }
    catch (err) {
        console.error("Error running updateTaskStatus", err);
        throw err;
    }
    finally {
        if (conn) {
            (0, db_1.closeDatabase)(conn);
        }
    }
}
async function checkQueueIsEmpty() {
    let conn;
    try {
        conn = await (0, db_1.getConnection)();
        const stmt = await conn.prepare("SELECT COUNT(*) as count FROM projects WHERE status = ?");
        const result = await stmt.get('pending'); // Replace 'pending' with your actual pending status string if different
        await stmt.finalize();
        return result.count;
    }
    catch (err) {
        console.error("Error running checkQueueIsEmpty", err);
        throw err;
    }
    finally {
        if (conn) {
            (0, db_1.closeDatabase)(conn);
        }
    }
}
async function getNextPendingProject() {
    let conn;
    try {
        conn = await (0, db_1.getConnection)();
        await conn.exec("BEGIN IMMEDIATE;");
        const project = await conn.get(`
            SELECT * FROM projects 
            WHERE status = 'pending' 
            ORDER BY order_index ASC, created_at ASC
            LIMIT 1
        `);
        if (!project) {
            await conn.exec("COMMIT;");
            return null;
        }
        // Get associated tasks
        const tasks = await conn.all(`
            SELECT * FROM tasks 
            WHERE project_id = ? 
            ORDER BY id ASC
        `, project.id);
        await conn.exec("COMMIT;");
        return {
            ...project,
            global_vars: JSON.parse(project.global_vars),
            is_active: Boolean(project.is_active),
            tasks: tasks.map((task) => ({
                ...task,
                task_params: JSON.parse(task.task_params),
                is_active: Boolean(task.is_active),
            })),
        };
    }
    catch (err) {
        console.error("Error running getNextPendingProject:", err);
        await conn?.exec("ROLLBACK;");
        throw err;
    }
    finally {
        if (conn) {
            (0, db_1.closeDatabase)(conn);
        }
    }
}
async function updateProjectStatus(projectId, status) {
    let conn;
    try {
        conn = await (0, db_1.getConnection)();
        const stmt = await conn.prepare("UPDATE projects SET status = ? WHERE id = ?");
        await stmt.run(status, projectId);
        await stmt.finalize();
    }
    catch (err) {
        console.error("Error running updateProjectStatus:", err);
        throw err;
    }
    finally {
        if (conn) {
            (0, db_1.closeDatabase)(conn);
        }
    }
}
async function addProject(project) {
    let conn;
    try {
        conn = await (0, db_1.getConnection)();
        await conn.exec("BEGIN IMMEDIATE;");
        // Insert project
        const projectStmt = await conn.prepare("INSERT INTO projects (project_key, global_vars, order_index, status) VALUES (?, ?, json(?), ?, ?)");
        const result = await projectStmt.run(project.project_key, JSON.stringify(project.global_vars), project.order_index, project.status);
        await projectStmt.finalize();
        // Set the project ID from the insert result
        if (result.lastID) {
            project.id = result.lastID;
        }
        // Insert tasks if they exist
        if (project.tasks && project.tasks.length > 0) {
            const taskStmt = await conn.prepare("INSERT INTO tasks (project_id, guid, type, name, comment, action, task_params, next_task_guid,  is_active, status) VALUES (?, ?, ?, ?, ?, ?, json(?), ?, ?, ?)");
            for (const task of project.tasks) {
                task.project_id = project.id;
                const taskResult = await taskStmt.run(project.id, task.guid, task.type, task.name, task.comment, task.action, JSON.stringify(task.task_params), task.next_task_guid, task.is_active, task.status);
                if (taskResult.lastID) {
                    task.id = taskResult.lastID;
                }
            }
            await taskStmt.finalize();
        }
        await conn.exec("COMMIT;");
    }
    catch (err) {
        await conn?.exec("ROLLBACK;");
        console.error("Error running addProject", err);
        throw err;
    }
    finally {
        if (conn) {
            (0, db_1.closeDatabase)(conn);
        }
    }
}
async function removeProject(projectId) {
    let conn;
    try {
        conn = await (0, db_1.getConnection)();
        const stmt = await conn.prepare("DELETE FROM projects WHERE id = ?");
        await stmt.run(projectId);
        await stmt.finalize();
    }
    catch (err) {
        console.error("Error running removeProject", err);
        throw err;
    }
    finally {
        if (conn) {
            (0, db_1.closeDatabase)(conn);
        }
    }
}
async function removeAllProjectsQuery() {
    let conn;
    try {
        conn = await (0, db_1.getConnection)();
        await conn.exec('DELETE FROM projects WHERE status = "pending"');
    }
    catch (err) {
        console.error("Error running removeAllProjectsQuery", err);
        throw err;
    }
    finally {
        if (conn) {
            (0, db_1.closeDatabase)(conn);
        }
    }
}
async function switchProjects(projectId1, projectId2) {
    let conn;
    try {
        conn = await (0, db_1.getConnection)();
        await conn.exec("BEGIN IMMEDIATE;");
        const stmt = await conn.prepare("SELECT order_index FROM projects WHERE id = ?");
        const result1 = await stmt.get(projectId1);
        const result2 = await stmt.get(projectId2);
        if (!result1 || !result2) {
            throw new Error("One or both projects not found");
        }
        const updateStmt = await conn.prepare("UPDATE projects SET order_index = ? WHERE id = ?");
        await updateStmt.run(result2.order_index, projectId1);
        await updateStmt.run(result1.order_index, projectId2);
        await updateStmt.finalize();
        await stmt.finalize();
        await conn.exec("COMMIT;"); // Commit transaction
    }
    catch (err) {
        await conn?.exec("ROLLBACK;"); // Rollback on error
        console.error("Error running moveProject", err);
        throw err;
    }
    finally {
        if (conn) {
            (0, db_1.closeDatabase)(conn);
        }
    }
}
async function insertTaskLog(taskId, status, message, logLevel = "info") {
    let conn;
    try {
        conn = await (0, db_1.getConnection)();
        const stmt = await conn.prepare("INSERT INTO Logs (task_id, status, log_message, log_level) VALUES (?, ?, ?, ?)");
        await stmt.run(taskId, status, message, logLevel);
        await stmt.finalize();
    }
    catch (err) {
        console.error("Error running insertTaskLog:", err);
        throw err;
    }
    finally {
        if (conn) {
            (0, db_1.closeDatabase)(conn);
        }
    }
}
async function getLatestLogs(limit, offset, logLevel, since) {
    let conn;
    try {
        conn = await (0, db_1.getConnection)();
        // Build the query with optional filters
        const conditions = [];
        const params = [];
        if (logLevel) {
            conditions.push("log_level = ?");
            params.push(logLevel);
        }
        if (since) {
            conditions.push("timestamp >= ?");
            params.push(since.toISOString().slice(0, 19).replace("T", " "));
        }
        const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
        // Add pagination parameters
        params.push(limit, offset);
        // Get logs with pagination
        const logs = await conn.all(`
            SELECT * FROM V_TaskLogs 
            ${whereClause}
            ORDER BY timestamp DESC 
            LIMIT ? OFFSET ?
        `, params);
        // Get total count with the same filter
        const totalResult = await conn.get(`SELECT COUNT(*) as count FROM V_TaskLogs ${whereClause}`, params.slice(0, -2) // Remove limit and offset from params
        );
        return {
            logs: logs.map((log) => ({
                ...log,
                task_params: JSON.parse(log.task_params),
                timestamp: new Date(log.timestamp),
            })),
            total: totalResult.count,
        };
    }
    catch (err) {
        console.error("Error fetching latest logs:", err);
        throw err;
    }
    finally {
        if (conn) {
            (0, db_1.closeDatabase)(conn);
        }
    }
}
async function updateTaskTimes(taskId, startedAt, completedAt) {
    let conn;
    try {
        conn = await (0, db_1.getConnection)();
        const stmt = await conn.prepare(`UPDATE tasks 
             SET started_at = ?, completed_at = ?
             WHERE id = ?`);
        await stmt.run(startedAt.toISOString(), completedAt?.toISOString(), taskId);
        await stmt.finalize();
    }
    catch (err) {
        console.error("Error running updateTaskTimes:", err);
        throw err;
    }
    finally {
        if (conn) {
            (0, db_1.closeDatabase)(conn);
        }
    }
}
async function updateTaskNextGuid(taskId, successNextTaskGuid) {
    let conn;
    try {
        conn = await (0, db_1.getConnection)();
        const stmt = await conn.prepare("UPDATE tasks SET next_task_guid = ? WHERE id = ?");
        await stmt.run(successNextTaskGuid, taskId);
        await stmt.finalize();
    }
    catch (err) {
        console.error("Error running updateTaskNextGuid:", err);
        throw err;
    }
    finally {
        if (conn) {
            (0, db_1.closeDatabase)(conn);
        }
    }
}
async function getTaskById(taskId) {
    let conn;
    try {
        conn = await (0, db_1.getConnection)();
        const task = await conn.get("SELECT * FROM tasks WHERE id = ?", taskId);
        if (task) {
            return {
                ...task,
                task_params: JSON.parse(task.task_params),
                is_active: Boolean(task.is_active),
            };
        }
        return undefined;
    }
    catch (err) {
        console.error("Error running getTaskById:", err);
        throw err;
    }
    finally {
        if (conn) {
            (0, db_1.closeDatabase)(conn);
        }
    }
}
async function getProjectById(projectId) {
    let conn;
    try {
        conn = await (0, db_1.getConnection)();
        const project = await conn.get("SELECT * FROM projects WHERE id = ?", projectId);
        return project;
    }
    catch (err) {
        console.error("Error running getProjectById:", err);
        throw err;
    }
    finally {
        if (conn) {
            (0, db_1.closeDatabase)(conn);
        }
    }
}
async function recoverInterruptedProject() {
    let conn;
    try {
        conn = await (0, db_1.getConnection)();
        await conn.exec("BEGIN IMMEDIATE;");
        // Get the single running project and its running tasks
        const project = await conn.get(`
            SELECT id 
            FROM projects 
            WHERE status = 'running' 
            LIMIT 1
        `);
        if (project) {
            // Update any running tasks to pending
            await conn.run(`
                UPDATE tasks 
                SET status = 'pending' 
                WHERE project_id = ? 
                AND status = 'running'
            `, project.id);
            // Update project status to pending
            await conn.run(`
                UPDATE projects 
                SET status = 'pending' 
                WHERE id = ?
            `, project.id);
            console.log(`Recovered interrupted project ${project.id}`);
        }
        await conn.exec("COMMIT;");
    }
    catch (err) {
        await conn?.exec("ROLLBACK;");
        console.error("Error recovering interrupted project:", err);
        throw err;
    }
    finally {
        if (conn) {
            (0, db_1.closeDatabase)(conn);
        }
    }
}
async function rerunProjectByTaskId(projectId, taskId) {
    let conn;
    try {
        conn = await (0, db_1.getConnection)();
        await conn.exec("BEGIN IMMEDIATE;");
        // Get project info for the given task
        const project = await conn.get(`
            SELECT p.* 
            FROM projects p  
            WHERE p.id = ?
        `, projectId);
        if (!project) {
            throw new Error("Project not found for the given task");
        }
        if (project.status === "running") {
            throw new Error("Project is already running");
        }
        // Check for any running project
        const runningProject = await conn.get(`
            SELECT * FROM projects 
            WHERE status = 'running'
            ORDER BY order_index ASC 
            LIMIT 1
        `);
        let newOrderIndex;
        if (runningProject) {
            await conn.run(`
                UPDATE projects 
                SET order_index = order_index + 1
                WHERE order_index > ?
            `, runningProject.order_index);
            newOrderIndex = runningProject.order_index + 1;
        }
        else {
            const lastOrderRow = await conn.get("SELECT COALESCE(MAX(order_index), -1) as last_order FROM projects");
            newOrderIndex = lastOrderRow.last_order + 1;
        }
        // Update the project's position and status
        await conn.run(`UPDATE projects 
             SET order_index = ?, status = 'pending'
             WHERE id = ?`, newOrderIndex, project.id);
        // Update tasks status - set to 'pending' for the specified task and all subsequent tasks
        await conn.run(`
            UPDATE tasks 
            SET status = 'pending',
                started_at = NULL,
                completed_at = NULL
            WHERE project_id = ? AND (? IS NULL OR id >= ?)`, project.id, taskId || null, taskId || null);
        await conn.exec("COMMIT;");
    }
    catch (err) {
        await conn?.exec("ROLLBACK;");
        console.error("Error running rerunProjectByTaskId:", err);
        throw err;
    }
    finally {
        if (conn) {
            (0, db_1.closeDatabase)(conn);
        }
    }
}
async function updateNextTaskByName(taskId, nextTaskName) {
    let conn;
    try {
        conn = await (0, db_1.getConnection)();
        await conn.exec("BEGIN IMMEDIATE;");
        // First get the project_id of the source task
        const sourceTask = await conn.get("SELECT project_id FROM tasks WHERE id = ?", taskId);
        if (!sourceTask) {
            throw new Error("Source task not found");
        }
        // Find the target task by name in the same project
        let targetTaskGuid = null;
        if (nextTaskName) {
            const targetTask = await conn.get("SELECT guid FROM tasks WHERE project_id = ? AND name = ?", sourceTask.project_id, nextTaskName);
            if (!targetTask) {
                throw new Error(`Task with name "${nextTaskName}" not found in the same project`);
            }
            targetTaskGuid = targetTask.guid;
        }
        // Update the next_task_guid
        const stmt = await conn.prepare("UPDATE tasks SET next_task_guid = ? WHERE id = ?");
        await stmt.run(targetTaskGuid, taskId);
        await stmt.finalize();
        await conn.exec("COMMIT;");
    }
    catch (err) {
        await conn?.exec("ROLLBACK;");
        console.error("Error running updateTaskNextGuidByName:", err);
        throw err;
    }
    finally {
        if (conn) {
            (0, db_1.closeDatabase)(conn);
        }
    }
}
async function addTasksToProject(projectId, projectKey, tasks) {
    let conn;
    try {
        conn = await (0, db_1.getConnection)();
        await conn.exec("BEGIN IMMEDIATE;");
        // Find project by ID or key
        let project;
        if (projectId !== undefined) {
            project = await conn.get("SELECT * FROM projects WHERE id = ?", projectId);
        }
        else if (projectKey) {
            project = await conn.get("SELECT * FROM projects WHERE project_key = ?", projectKey);
        }
        if (!project) {
            throw new Error(`Project ${projectId ? `with ID ${projectId}` : `with key "${projectKey}"`} not found`);
        }
        if (project.status === "completed") {
            throw new Error(`Project ${projectId ? `with ID ${projectId}` : `with key "${projectKey}"`} is completed, cant add tasks to completed projects`);
        }
        const taskStmt = await conn.prepare("INSERT INTO tasks (project_id, guid, type, name, comment, action, task_params, next_task_guid, is_active, status) VALUES (?, ?, ?, ?, ?, ?, json(?), ?, ?, ?)");
        const insertedTasks = [];
        for (const task of tasks) {
            task.project_id = project.id;
            const taskResult = await taskStmt.run(project.id, task.guid ?? (0, uuid_1.v4)(), task.type, task.name, task.comment, task.action, JSON.stringify(task.task_params), task.next_task_guid, task.is_active, task.status || "pending");
            if (taskResult.lastID) {
                task.id = taskResult.lastID;
                insertedTasks.push(task);
            }
        }
        await taskStmt.finalize();
        await conn.exec("COMMIT;");
        return insertedTasks;
    }
    catch (err) {
        await conn?.exec("ROLLBACK;");
        console.error("Error running addTasksToProject", err);
        throw err;
    }
    finally {
        if (conn) {
            (0, db_1.closeDatabase)(conn);
        }
    }
}
async function getEventReason(taskId) {
    let conn;
    try {
        conn = await (0, db_1.getConnection)();
        const result = await conn.get(`SELECT log_message FROM V_TaskLogs WHERE task_id = ? ORDER BY timestamp DESC LIMIT 1`, [taskId]);
        return result?.log_message || null;
    }
    catch (err) {
        console.error("Error running getEventReason", err);
        throw err;
    }
    finally {
        if (conn) {
            (0, db_1.closeDatabase)(conn);
        }
    }
}
async function abortAllProjects() {
    let conn;
    try {
        conn = await (0, db_1.getConnection)();
        await conn.exec("BEGIN IMMEDIATE;");
        // Update all running and pending projects to aborted
        await conn.run(`UPDATE projects 
       SET status = 'aborted' 
       WHERE status IN ('running', 'pending')`);
        // Update all running and pending tasks to aborted
        await conn.run(`UPDATE tasks 
       SET status = 'aborted' 
       WHERE status IN ('running', 'pending')`);
        await conn.exec("COMMIT;");
    }
    catch (err) {
        await conn?.exec("ROLLBACK;");
        console.error("Error aborting all projects:", err);
        throw err;
    }
    finally {
        if (conn) {
            (0, db_1.closeDatabase)(conn);
        }
    }
}
