/**
* Organization Parser Service
* 
* This service provides functions to parse data from external ERP sources in XML format.
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
      const deptId = dept.$.id;

      if (!deptName || !deptId) {
        errors.push('Departamento con formato incorrecto: falta nombre o id');
        return;
      }

      // Store department
      departments.push({ department_id: deptId, department_name: deptName });

      // Get cost centers
      const deptCostCenters = dept.CentroCosto
        ? Array.isArray(dept.CentroCosto) ? dept.CentroCosto : [dept.CentroCosto]
        : [];
      
      // Iterate through each cost center
      deptCostCenters.forEach((cc) => {
        if (!cc || !cc.$) {
          errors.push(`Centro de costo con formato incorrecto en departamento ${deptName}`);
          return;
        }
        costCenters.push({
          cost_center_id: cc.$.id,
          cost_center_name: cc.$.name,
          department_id: deptId,
        });
      });

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
          user_id: emp.$.id,
          user_name: emp.$.usuario,
          email: emp.$.correo,
          role: emp.$.rol,
          workstation: emp.$.workstation,
          password: emp.$.password,
          boss_id: emp.$.jefe_id || null,
          department_id: deptId,
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