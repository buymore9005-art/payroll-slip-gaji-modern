import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/services/activity.service';
import { IMPORT_HEADERS, validateImportRows, type RawImportRow } from '@/utils/importEmployees';
import type { ImportEmployeeRow, ImportValidationResult } from '@/types/domain';
import type { DepartmentRow, DivisionRow, Json, PositionRow } from '@/types/database';

export type ImportExecutionResult = {
  success:number; failed:number;
  errors:Array<{rowNumber:number;nik:string;message:string}>;
};
export async function parseEmployeeWorkbook(file:File):Promise<ImportValidationResult> {
  const ext=file.name.split('.').pop()?.toLowerCase();
  if(ext!=='xlsx'&&ext!=='xls') throw new Error('Gunakan file Excel berformat .xlsx atau .xls.');
  if(file.size>10*1024*1024) throw new Error('Ukuran file maksimal 10 MB.');
  const workbook=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false});
  const sheetName=workbook.SheetNames[0];
  if(!sheetName) throw new Error('Workbook tidak memiliki worksheet.');
  const sheet=workbook.Sheets[sheetName];
  const matrix=XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,defval:'',raw:false});
  const headers=(matrix[0]??[]).map(String).map(v=>v.trim());
  const missing=IMPORT_HEADERS.filter(header=>!headers.includes(header));
  if(missing.length) throw new Error(`Kolom template tidak lengkap: ${missing.join(', ')}.`);
  const rows=XLSX.utils.sheet_to_json<RawImportRow>(sheet,{defval:'',raw:false});
  const result=validateImportRows(rows);
  if(!result.validRows.length&&!result.errors.length) throw new Error('File tidak memiliki data karyawan.');
  return result;
}
const key=(value:string)=>value.trim().toLocaleLowerCase('id-ID');
async function resolveLookups(rows:ImportEmployeeRow[]) {
  const [a,b,c]=await Promise.all([
    supabase.from('divisions').select('*'),
    supabase.from('departments').select('*'),
    supabase.from('positions').select('*')
  ]);
  const error=a.error||b.error||c.error;
  if(error) throw new Error(error.message);
  const divisions = new Map<string, DivisionRow>(
    (a.data ?? []).map(item => [key(String(item.name)), item as DivisionRow] as const),
  );
  const departments = new Map<string, DepartmentRow>(
    (b.data ?? []).map(item => [`${item.division_id}:${key(String(item.name))}`, item as DepartmentRow] as const),
  );
  const positions = new Map<string, PositionRow>(
    (c.data ?? []).map(item => [`${item.department_id ?? ''}:${key(String(item.name))}`, item as PositionRow] as const),
  );
  for(const row of rows) {
    const divisionKey=key(row.division);
    if(!divisions.has(divisionKey)) {
      const{data,error:insertError}=await supabase.from('divisions')
        .insert({name:row.division.trim(),description:'Dibuat melalui import karyawan'})
        .select('*').single();
      if(insertError) throw new Error(`Divisi ${row.division}: ${insertError.message}`);
      divisions.set(divisionKey, data as DivisionRow);
    }
    const division=divisions.get(divisionKey)!;
    const departmentKey=`${division.id}:${key(row.department)}`;
    if(!departments.has(departmentKey)) {
      const{data,error:insertError}=await supabase.from('departments')
        .insert({division_id:division.id,name:row.department.trim(),description:'Dibuat melalui import karyawan'})
        .select('*').single();
      if(insertError) throw new Error(`Departemen ${row.department}: ${insertError.message}`);
      departments.set(departmentKey, data as DepartmentRow);
    }
    const department=departments.get(departmentKey)!;
    const positionKey=`${department.id}:${key(row.position)}`;
    if(!positions.has(positionKey)) {
      const{data,error:insertError}=await supabase.from('positions')
        .insert({department_id:department.id,name:row.position.trim(),description:'Dibuat melalui import karyawan'})
        .select('*').single();
      if(insertError) throw new Error(`Jabatan ${row.position}: ${insertError.message}`);
      positions.set(positionKey, data as PositionRow);
    }
  }
  return{divisions,departments,positions};
}
export async function executeEmployeeImport(input:{
  rows:ImportEmployeeRow[];fileName:string;userId:string;onProgress?:(value:number)=>void;
}):Promise<ImportExecutionResult> {
  const lookups=await resolveLookups(input.rows);
  const errors:ImportExecutionResult['errors']=[];
  let success=0;
  const today=new Date().toISOString().slice(0,10);
  for(let index=0;index<input.rows.length;index+=1) {
    const row=input.rows[index];
    const division=lookups.divisions.get(key(row.division))!;
    const department=lookups.departments.get(`${division.id}:${key(row.department)}`)!;
    const position=lookups.positions.get(`${department.id}:${key(row.position)}`)!;
    const payload={
      nik:row.nik,name:row.name,division_id:division.id,department_id:department.id,
      position_id:position.id,employment_status:'permanent',join_date:today,
      bank_account:row.bankAccount,bank_name:row.bankName,npwp:'',bpjs:'',
      basic_salary:row.basicSalary,fixed_allowance:row.allowance,variable_allowance:0,
      email:row.email,phone:row.phone,created_by:input.userId,updated_by:input.userId
    };
    const{error}=await supabase.from('employees').upsert(payload,{onConflict:'nik'});
    if(error) errors.push({rowNumber:row.rowNumber,nik:row.nik,message:error.message});
    else success+=1;
    input.onProgress?.(((index+1)/input.rows.length)*100);
  }
  const{data:batch,error:batchError}=await supabase.from('import_batches').insert({
    file_name:input.fileName,total_rows:input.rows.length,success_rows:success,
    failed_rows:errors.length,errors:errors as unknown as Json,created_by:input.userId
  }).select('id').single();
  if(batchError) throw new Error(batchError.message);
  await logActivity({
    action:'IMPORT',entityType:'employees',entityId:String(batch.id),
    description:`Import ${input.fileName}: ${success} berhasil, ${errors.length} gagal`,
    metadata:{total:input.rows.length,success,failed:errors.length}
  });
  return{success,failed:errors.length,errors};
}
