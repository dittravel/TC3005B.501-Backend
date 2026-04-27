/**
* Organization Parser Service
* 
* This service provides functions to parse data from external ERP sources in XML or JSON format.
* This file contains an organigram of the departments and eployees of a company,
* which is used to populate the database with the corresponding data.
*/

/**
* Parse the organizational structure from an XML file and extract relevant data.
* @param {string} xmlObj - XML object containing the organizational structure data.
* @returns {Object} An object containing the extracted data from the XML
*/
export async function extractExternalData(xmlObj) {
  try {
    // results and errors detected
    const users = [];
    const departments = [];
    const costCenters = [];
    const errors = [];

    // Principal node of the XML
    const org = xmlObj.Organizacion;

    if (!org) {
      errors.push('Nodo raíz no encontrado en XML');
      return { users, departments, costCenters, errors };
    }

    // Get departments
    // If there is only one department, it will not be an array, so we need to handle both cases
    const departmentsXml = Array.isArray(org.Departamento)
      ? org.Departamento
      : [org.Departamento];

    // Iterate through each department and extract employee data
    departmentsXml.forEach((dept) => {
      const deptName = dept.$.name;
      const deptCostCenter = dept.$.cost_center;

      if (!deptName) {
        errors.push('Departamento con formato incorrecto: falta nombre o centro de costo');
        return;
      }

      // Store department
      departments.push({ department_name: deptName, cost_center_name: deptCostCenter });

      // Store cost centers
      costCenters.push({ cost_center_name: deptCostCenter });

      // Get employees
      const employees = dept.Empleado
        ? Array.isArray(dept.Empleado) ? dept.Empleado : [dept.Empleado]
        : [];
      
      // Iterate through each employee in the department
      employees.forEach((emp) => {
        if (!emp || !emp.$) {
          errors.push(`Empleado con formato incorrecto en departamento ${deptName}`);
          return;
        }

        users.push({
          user_name: emp.$.usuario,
          email: emp.$.correo,
          phone_number: emp.$.telefono || null,
          role: emp.$.rol,
          workstation: emp.$.workstation,
          password: emp.$.password,
          jefe_usuario: emp.$.jefe_usuario || null,
          department_name: deptName,
        });
      });
    });

    return { users, departments, costCenters, errors };
  } catch (error) {
    const errorMessage = 'Error al extraer los datos del XML: ' + error.message;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

/**
* Parse the organizational structure from a JSON file and extract relevant data.
* The JSON represents data for a single society (auto-detected from admin's context).
* @param {Object} jsonObj - JSON object containing the organizational structure data.
* @param {number} societyId - The society ID of the admin importing the data (auto-assigned)
* @returns {Object} An object containing the extracted data from the JSON
*/
export async function extractExternalDataFromJSON(jsonObj, societyId) {
  try {
    const users = [];
    const departments = [];
    const costCenters = [];
    const errors = [];

    // Validate that societyId is provided
    if (!societyId) {
      errors.push('ID de la sociedad no proporcionado. Se debe obtener del admin autenticado.');
      return { users, departments, costCenters, society_id: null, errors };
    }

    let groupCecoCatalog = {};
    let groupDepartmentCatalog = {};

    // Parse Cost Centers catalog
    if (jsonObj.CeCo && Array.isArray(jsonObj.CeCo)) {
      jsonObj.CeCo.forEach((cc) => {
        if (cc.Clave && cc.Descripcion) {
          groupCecoCatalog[cc.Clave] = cc.Descripcion;
          costCenters.push({
            cost_center_id: cc.Clave,
            cost_center_name: cc.Descripcion,
            society_id: societyId
          });
        } else {
          errors.push('Centro de Costo con formato incorrecto: falta Clave o Descripcion');
        }
      });
    }

    // Parse Departments catalog
    if (jsonObj.Departamentos && Array.isArray(jsonObj.Departamentos)) {
      jsonObj.Departamentos.forEach((dept) => {
        if (dept.Clave && dept.Descripcion) {
          groupDepartmentCatalog[dept.Clave] = {
            name: dept.Descripcion,
            cost_center_id: dept.CeCo || null
          };
          departments.push({
            department_name: dept.Descripcion,
            cost_center_id: dept.CeCo || null,
            society_id: societyId
          });
        } else {
          errors.push('Departamento con formato incorrecto: falta Clave o Descripcion');
        }
      });
    }

    // Process employees
    const empleados = Array.isArray(jsonObj.Empleados) ? jsonObj.Empleados : [jsonObj.Empleados];

    if (!empleados || empleados.length === 0) {
      errors.push('Estructura JSON inválida: falta Empleados o está vacío');
      return { users, departments, costCenters, society_id: societyId, errors };
    }

    // Map employee numbers to usernames
    const employeeToUsername = {};
    empleados.forEach((emp) => {
      if (emp.NoEmpleado && emp.Usuario) {
        employeeToUsername[emp.NoEmpleado] = emp.Usuario;
      }
    });

    empleados.forEach((emp, index) => {
      if (!emp || !emp.Usuario || !emp.Email) {
        errors.push(`Empleado en posición ${index} tiene formato incorrecto: falta Usuario o Email`);
        return;
      }

      // Get department info from catalog
      const deptInfo = emp.Departamento ? groupDepartmentCatalog[emp.Departamento] : null;
      const departamento = deptInfo ? deptInfo.name : 'Sin Departamento';
      const costCenterId = emp.CeCo || (deptInfo ? deptInfo.cost_center_id : null);

      // Add user
      users.push({
        user_name: emp.Usuario,
        email: emp.Email,
        phone_number: emp.Telefono || null,
        role: null, // Will be assigned to default role by the import service
        workstation: emp.EstacionTrabajo || null,
        password: emp.Contraseña || `${emp.Usuario}123`,
        boss_user: emp.JefeInmediato ? employeeToUsername[emp.JefeInmediato] : null,
        department_name: departamento,
        cost_center_id: costCenterId,
        active: emp.Status === 'A' ? true : false,
        society_id: societyId,
        supplier: emp.Proveedor || null
      });
    });

    return { users, departments, costCenters, society_id: societyId, errors };
  } catch (error) {
    const errorMessage = 'Error al extraer los datos del JSON: ' + error.message;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

/**
* Assign roles automatically based on organizational hierarchy
* CURRENTLY NOT IN USE BUT CAN BE USED IN THE FUTURE TO AUTOMATICALLY 
* ASSIGN ROLES BASED ON THE HIERARCHY OF THE EMPLOYEES IN THE ORGANIGRAM
* @param {Array} employees - Array of employee objects with department_name and boss_user
* @param {number} defaultNumLevels - Number of authorization levels (default: 2)
* @returns {Array} Employees with assigned roles
*/
export function assignRolesByHierarchy(employees, authorizations = 2) {
  if (!employees || employees.length === 0) {
    return employees;
  }

  // Group employees by department
  const employeesByDept = {};
  employees.forEach(emp => {
    const dept = emp.department_name || 'Sin Departamento';
    if (!employeesByDept[dept]) {
      employeesByDept[dept] = [];
    }
    employeesByDept[dept].push(emp);
  });

  // Process each department independently
  Object.keys(employeesByDept).forEach(dept => {
    const deptEmployees = employeesByDept[dept];

    // Map of username to employee and track hierarchy
    const empMap = {};
    deptEmployees.forEach(emp => {
      empMap[emp.user_name] = emp;
    });

    // Calculate depth for each employee (how many levels below admin)
    // e.g. Admin (depth 0) -> Authorizer (depth 1) -> Applicant (depth 2)
    const depths = {};
    
    const calculateDepth = (userName, visited = new Set()) => {
      if (depths[userName] !== undefined) {
        return depths[userName];
      }

      if (visited.has(userName)) {
        return 0; // Circular reference, treat as depth 0
      }

      const emp = empMap[userName];
      if (!emp || !emp.boss_user) {
        // No boss = admin level = depth 0
        depths[userName] = 0;
        return 0;
      }

      // Add to visited set to prevent infinite loops
      visited.add(userName);

      // Calculate depth of boss and add 1
      const bossDepth = calculateDepth(emp.boss_user, visited);
      depths[userName] = bossDepth + 1;
      visited.delete(userName);

      return depths[userName];
    };

    // Calculate depths for all employees
    deptEmployees.forEach(emp => {
      calculateDepth(emp.user_name);
    });

    // Assign roles based on depth
    deptEmployees.forEach(emp => {
      const depth = depths[emp.user_name];

      if (depth === 0) {
        // Admin level
        emp.role = 'Administrador';
      } else if (depth === 1) {
        // Accounts payable level
        emp.role = 'Cuentas por pagar';
      } else if (depth === 2) {
        // Travel agency level
        emp.role = 'Agencia de viajes';
      } else if (depth >= 3 && depth < 3 + authorizations) {
        // Authorizer levels
        emp.role = 'Autorizador';
      } else {
        // Levels beyond authorizers
        emp.role = 'Solicitante';
      }
    });
  });

  return employees;
}