export class PersonalError extends Error {
 constructor(message,status=400,code='INVALID_INPUT') {super(message);this.status=status;this.code=code;}
}
